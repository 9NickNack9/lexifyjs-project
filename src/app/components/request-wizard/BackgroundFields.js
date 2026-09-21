"use client";

import AutoGrowTextarea from "@/app/components/AutoGrowTextarea";
import { FIELD_CLASS } from "@/lib/requestWizard";

export default function BackgroundFields({
  formData,
  onChange,
  onFileChange,
  onDeleteFile,
  heading = "Please provide additional background information, if any, you wish to share with legal service providers in your LEXIFY Request. If you want, you can also upload a separate file with additional background information by clicking “Upload Background Info”.",
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">{heading}</h4>
      <AutoGrowTextarea
        name="background"
        className={FIELD_CLASS}
        onChange={onChange}
        value={formData.background}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
          Upload Background Info
          <input
            type="file"
            name="backgroundFiles"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
        </label>
        <span className="text-sm text-gray-500">
          {formData.backgroundFiles?.length
            ? `${formData.backgroundFiles.length} file(s) selected`
            : "No files selected"}
        </span>
      </div>
      {formData.backgroundFiles?.length > 0 ? (
        <ul className="space-y-2">
          {formData.backgroundFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onDeleteFile(index)}
                className="ml-2 cursor-pointer rounded bg-red-500 px-2 py-1 text-xs text-white"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
