"use client";

import React from "react";

interface EditProfileModalProps {
  newUsername: string;
  setNewUsername: (value: string) => void;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  paymentId: string;
  setPaymentId: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
}

export default function EditProfileModal({
  newUsername,
  setNewUsername,
  paymentMethod,
  setPaymentMethod,
  paymentId,
  setPaymentId,
  onClose,
  onSave,
  loading,
}: EditProfileModalProps) {
  const isMTurk = paymentMethod === "MTurk";
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
            <label className="block text-white text-sm font-medium mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="text-black p-2 rounded w-full"
            >
              <option value="PayPal">PayPal</option>
              <option value="MTurk">MTurk</option>
            </select>
            <p className="text-gray-400 text-xs mt-1">
              MTurk payouts are being discontinued — switch to PayPal to keep
              receiving your payments.
            </p>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              {isMTurk ? "MTurk Worker ID" : "PayPal Email"}
            </label>
            <input
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              className="text-black p-2 rounded w-full"
              placeholder={
                isMTurk ? "Enter your MTurk Worker ID" : "Enter your PayPal email address"
              }
            />
            <p className="text-gray-400 text-xs mt-1">
              {isMTurk
                ? "This is where your MTurk bonus payouts are sent."
                : "This is the PayPal account your payouts will be sent to — make sure it matches your PayPal login email."}
            </p>
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