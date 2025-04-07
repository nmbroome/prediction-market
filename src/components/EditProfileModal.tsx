"use client";

import React from "react";

interface EditProfileModalProps {
  newUsername: string;
  setNewUsername: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
}

export default function EditProfileModal({
  newUsername,
  setNewUsername,
  onClose,
  onSave,
  loading,
}: EditProfileModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl mb-2">Edit Username</h3>
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          className="text-black p-2 rounded w-full"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white p-2 rounded mr-2"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="bg-green-500 text-white p-2 rounded"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
