import os
import json
from pathlib import Path
from mcp.server.fastmcp import FastMCP, Context

# Create an MCP server instance
mcp = FastMCP("docs_manager")

# Define the docs directory relative to the script location, not current working directory
# Get the directory where the script is located
SCRIPT_DIR = Path(__file__).resolve().parent
# Define docs directory relative to script location
DOCS_DIR = SCRIPT_DIR / "docs"

# Ensure the docs directory exists
os.makedirs(DOCS_DIR, exist_ok=True)

def kebab_case(text):
    """Convert text to kebab-case."""
    return text.lower().replace(" ", "-")

@mcp.tool(description="List all documentation files available in the docs folder")
def list_docs() -> str:
    """
    List all available documentation files in the docs folder.
    
    Returns:
        A string containing the list of available docs or a message if no docs are found.
    """
    doc_files = list(DOCS_DIR.glob("*.md"))
    
    if not doc_files:
        return "No documentation files found."
    
    result = "Available documentation files:\n\n"
    for doc_file in doc_files:
        result += f"- {doc_file.name}\n"
    
    return result

@mcp.tool(description="Read content from one or more documentation files")
def read_docs(filenames: list[str]) -> str:
    """
    Read the content of one or more documentation files.
    
    Args:
        filenames: List of documentation filenames to read (without the path)
    
    Returns:
        The content of the requested documentation files or error message if not found.
    """
    if not filenames:
        return "Error: No filenames provided."
    
    result = ""
    
    for filename in filenames:
        # Ensure the filename has .md extension
        if not filename.endswith(".md"):
            filename += ".md"
        
        file_path = DOCS_DIR / filename
        
        if not file_path.exists():
            result += f"Error: File '{filename}' not found.\n\n"
            continue
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            result += f"## {filename}\n\n{content}\n\n{'='*50}\n\n"
        except Exception as e:
            result += f"Error reading '{filename}': {str(e)}\n\n"
    
    return result.strip()

@mcp.tool(description="Save content to a documentation file")
def save_docs(filename: str, content: str) -> str:
    """
    Save content to a documentation file in the docs folder.
    
    Args:
        filename: Name for the documentation file (will be converted to kebab-case if needed)
        content: The content to save to the file
    
    Returns:
        A message indicating success or failure
    """
    # Convert filename to kebab-case and ensure it has .md extension
    kebab_filename = kebab_case(filename)
    if not kebab_filename.endswith(".md"):
        kebab_filename += ".md"
    
    file_path = DOCS_DIR / kebab_filename
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        return f"Successfully saved documentation to {kebab_filename} in {DOCS_DIR}"
    except Exception as e:
        return f"Error saving documentation: {str(e)}"

@mcp.tool(description="Remove a documentation file")
def remove_docs(filename: str) -> str:
    """
    Remove a documentation file from the docs folder.
    
    Args:
        filename: Name of the documentation file to remove
    
    Returns:
        A message indicating success or failure
    """
    # Ensure the filename has .md extension
    if not filename.endswith(".md"):
        filename += ".md"
    
    file_path = DOCS_DIR / filename
    
    if not file_path.exists():
        return f"Error: File '{filename}' not found."
    
    try:
        os.remove(file_path)
        return f"Successfully removed {filename} from {DOCS_DIR}"
    except Exception as e:
        return f"Error removing documentation: {str(e)}"

if __name__ == "__main__":
    print(f"MCP Server starting. Documentation will be saved to: {DOCS_DIR}")
    mcp.run() 