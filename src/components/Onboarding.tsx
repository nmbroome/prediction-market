"use client";

import React, { useState } from "react";
import supabase from "@/lib/supabase/createClient";

export default function Onboarding() {
  const [paymentType, setPaymentType] = useState("PayPal");
  const [paymentEmail, setPaymentEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Unable to retrieve user information. Please try again.");
      return;
    }

    const userInfoData = {
      id: user.id,
      payment_type: paymentType,
      paypal_info: paymentType === "PayPal" ? paymentEmail : null,
      mturk_info: paymentType === "MTurk" ? paymentEmail : null,
    };

    const { error } = await supabase.from("profiles").insert(userInfoData);

    if (error) {
      setMessage("Error saving user information: " + error.message);
    } else {
      setMessage("Onboarding completed successfully!");
    }
  };

  return (
    <div className="container mx-auto mt-8 p-4 max-w-md bg-white text-black rounded shadow">
      <h2 className="text-xl font-bold mb-4">Complete Your Onboarding</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2 font-semibold">Payment Type</label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="PayPal">PayPal</option>
            <option value="MTurk">MTurk</option>
          </select>
        </div>

        <div>
          <label className="block mb-2 font-semibold">
            Payment Email ({paymentType})
          </label>
          <input
            type="email"
            value={paymentEmail}
            onChange={(e) => setPaymentEmail(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <p>IQ Test</p>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Submit
        </button>

        {message && <p className="mt-4 text-center text-red-500">{message}</p>}
      </form>
    </div>
  );
}
