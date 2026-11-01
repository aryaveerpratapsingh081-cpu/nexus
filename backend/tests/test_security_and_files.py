import pytest
from pathlib import Path
from app.security.path_guard import PathGuard, PathSecurityError, FileSizeExceededError, PathNotFoundError
from app.services.file_service import FileService
import fitz

def test_path_traversal_rejection(db_session):
    # Attempting to traverse out of approved directory
    traversal_path = "../../Windows/System32"
    with pytest.raises(PathSecurityError):
        PathGuard.validate_path_within_approved(traversal_path, db_session)

def test_unauthorized_directory_rejection(db_session):
    # Direct access to Windows directory or root
    unauthorized = "C:\\Windows"
    with pytest.raises(PathSecurityError):
        PathGuard.validate_path_within_approved(unauthorized, db_session)

def test_folder_creation_security(db_session):
    sandbox = Path(PathGuard.get_approved_directories(db_session)[0])

    # Traversal folder name should be blocked
    with pytest.raises(PathSecurityError):
        FileService.create_folder(str(sandbox), "../escaped_dir", db_session)

    # Illegal characters should be blocked
    with pytest.raises(PathSecurityError):
        FileService.create_folder(str(sandbox), "bad:name/folder", db_session)

    # Valid folder creation should succeed
    test_folder = sandbox / "valid_test_dir"
    if test_folder.exists():
        import shutil
        shutil.rmtree(test_folder)
    res = FileService.create_folder(str(sandbox), "valid_test_dir", db_session)
    assert res.success is True
    assert Path(res.created_path).is_dir()

def test_file_search_and_reading(db_session):
    sandbox = Path(PathGuard.get_approved_directories(db_session)[0])

    # Create a test text file
    sample_file = sandbox / "sample_doc.txt"
    sample_file.write_text("Hello Nexus AI OS! This is a test file for search and read.", encoding="utf-8")

    # Search file
    search_res = FileService.search_files(query="sample_doc", extension=".txt", directory=str(sandbox), db=db_session)
    assert search_res.total_found >= 1
    assert any("sample_doc.txt" in r.name for r in search_res.results)

    # Read file
    read_res = FileService.read_document(str(sample_file), db_session)
    assert read_res.filename == "sample_doc.txt"
    assert "Hello Nexus AI OS!" in read_res.content
    assert read_res.is_truncated is False

def test_pdf_creation_and_extraction(db_session):
    sandbox = Path(PathGuard.get_approved_directories(db_session)[0])
    pdf_path = sandbox / "generated_test.pdf"

    # Create a real small PDF with PyMuPDF
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Nexus AI OS Academic CSE Project PDF Extraction Test", fontsize=14)
    doc.save(str(pdf_path))
    doc.close()

    # Read document
    read_res = FileService.read_document(str(pdf_path), db_session)
    assert read_res.file_type == "PDF"
    assert read_res.page_count == 1
    assert "Nexus AI OS Academic CSE Project" in read_res.content
    assert read_res.is_scanned_pdf is False

