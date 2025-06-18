/**
 * Parameter types for the list_structure tool
 */
export interface ListStructureParams {
  dir: string;
}

/**
 * Parameter types for the read_files tool
 */
export interface ReadFilesParams {
  files: string[];
}

/**
 * Parameter types for the type_check tool
 */
export interface TypeCheckParams {
  dir: string;
}

/**
 * Result of a file read operation
 */
export interface FileReadResult {
  filePath: string;
  content: string | null;
  error: string | null;
  isEmptyFile?: boolean;
}

/**
 * Structure for directory entries
 */
export interface DirectoryStructure {
  [key: string]: DirectoryStructure | null;
} 