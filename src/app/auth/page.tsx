"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase/createClient';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iqVerified, setIqVerified] = useState(false); // Controls whether signup form is shown

  const router = useRouter();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      
      // TODO: AI verification will go here
      // For now, you can manually set iqVerified to true for testing
      setIqVerified(true);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setIqVerified(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Login successful!');
      router.push('/');
    }
    
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('Error signing up:', error.message);
      setMessage(`Error: ${error.message}`);
    } else {
      console.log('Sign-up successful:', data);
      setMessage('Signup successful! Please check your email to confirm.');
    }
    
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      await handleLogin();
    } else {
      await handleSignUp();
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setImage(null);
    setImagePreview(null);
    setIqVerified(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#101827]">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 shadow-lg rounded-lg border border-gray-700">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400">
            {isLogin 
              ? 'Sign in to your Prophet V3 account' 
              : 'Join Prophet V3 to start trading'
            }
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex rounded-lg bg-gray-700 p-1">
          <button
            type="button"
            onClick={() => {
              if (!isLogin) toggleMode();
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isLogin
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLogin) toggleMode();
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isLogin
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            // LOGIN FORM
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </>
          ) : (
            // SIGNUP FORM
            <>
              {/* IQ Verification Section - Always visible */}
              <div className="text-center mb-4">
                <p className="text-gray-400 text-lg mb-2">IQ Requirement</p>
                <p className="text-gray-500 text-sm">
                  To be able to sign up for an account, you must meet a certain IQ level. Please click the link below to be redirected to an IQ test and upload a screenshot of your result below.
                </p>
                <a 
                  href="https://openpsychometrics.org/tests/FSIQ/1.php" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Take IQ Test →
                </a>
              </div>

              {/* Image Upload Area - Always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload IQ Test Screenshot
                </label>
                
                {!imagePreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-650 hover:border-gray-500 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-400">
                        <span className="font-medium text-blue-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, or GIF</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="IQ Test Result Preview" 
                      className="w-full max-h-48 object-contain rounded-lg border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="text-sm text-gray-400 mt-2 text-center">{image?.name}</p>
                  </div>
                )}
              </div>

              {/* Signup Form Fields - Only visible after IQ verification */}
              {iqVerified ? (
                <>
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-green-400 text-sm text-center mb-4">
                      ✓ IQ requirement met! Complete your registration below.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Upload your IQ test screenshot to continue registration
                </div>
              )}
            </>
          )}
        </form>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('Error') 
              ? 'bg-red-900/20 border border-red-700 text-red-300' 
              : message.includes('successful')
                ? 'bg-green-900/20 border border-green-700 text-green-300'
                : 'bg-blue-900/20 border border-blue-700 text-blue-300'
          }`}>
            {message}
          </div>
        )}

        {/* Toggle Link */}
        <div className="text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>
      </div>
    </div>
  );
}