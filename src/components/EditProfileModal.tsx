"use client";

import React from "react";

interface EditProfileModalProps {
  newUsername: string;
  setNewUsername: (value: string) => void;
  paymentId: string;
  setPaymentId: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
}

export default function EditProfileModal({
  newUsername,
  setNewUsername,
  paymentId,
  setPaymentId,
  onClose,
  onSave,
  loading,
}: EditProfileModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4 text-white">Edit Profile</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="text-black p-2 rounded w-full"
              placeholder="Enter username"
            />
          </div>
          
          <div>
            <label className="block text-white text-sm font-medium mb-2">Payment ID</label>
            <input
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              className="text-black p-2 rounded w-full"
              placeholder="Enter payment ID (PayPal/MTurk)"
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-6 gap-2">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}