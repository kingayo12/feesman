import { HiClipboardCopy, HiDownload, HiDocumentText, HiPrinter } from "react-icons/hi";
import {
  copyTableData,
  exportTableCSV,
  exportTableExcel,
  printTable,
} from "../../utils/exportUtils";

export default function TableToolbar({ fileName, headers, rows }) {
  return (
    <div className='table-toolbar'>
      <button
        type='button'
        className='btn btn-secondary btn-sm'
        onClick={() => copyTableData(headers, rows)}
      >
        <HiClipboardCopy /> Copy
      </button>
      <button
        type='button'
        className='btn btn-secondary btn-sm'
        onClick={() => exportTableCSV(fileName, headers, rows)}
      >
        <HiDownload /> CSV
      </button>
      <button
        type='button'
        className='btn btn-secondary btn-sm'
        onClick={() => exportTableExcel(fileName, headers, rows)}
      >
        <HiDocumentText /> Excel
      </button>
      <button
        type='button'
        className='btn btn-secondary btn-sm'
        onClick={() => printTable(fileName, headers, rows)}
      >
        <HiPrinter /> PDF
      </button>
    </div>
  );
}
