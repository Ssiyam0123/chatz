"use client";
import { useAuth } from "@/store/useAuthStore.js";
import {
  MessageCircleIcon,
  MailIcon,
  LoaderIcon,
  LockIcon,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

function LoginPage() {
  const [loginPage, setLoginPage] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useAuth((state) => state.login);
  const register = useAuth((state) => state.register);

  const handleRegister = () => {
    register({ username : name, email, password });
    setEmail("");
    setName("");
    setPassword("");
  };
  const handleLogin = () => {
    login({ email, password });
    setEmail("");
    setName("");
    setPassword("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-900 to-emerald-950 p-4">
      <div className="relative w-full max-w-6xl md:h-[780px] h-[650px]">
        <div
          className={`h-full flex flex-col md:flex-row overflow-hidden rounded-3xl border border-emerald-500/30 bg-emerald-900/30 backdrop-blur-xl shadow-2xl shadow-emerald-900/40`}
        >
          <div
            className={`md:w-1/2 md:max-h-screen ${
              loginPage ? "" : "md:order-2"
            } flex items-center justify-center p-8 bg-gradient-to-br from-emerald-950/90 to-green-950/90 border-r border-emerald-500/20`}
          >
            {/* FORM Container */}
            <div className="w-full max-w-md">
              {/* HEADER */}
              <div className="text-center mb-8">
                <div className="relative inline-flex items-center justify-center">
                  <MessageCircleIcon className="w-12 h-12 text-emerald-400 z-10" />
                  <div className="absolute w-14 h-14 rounded-full bg-emerald-400/20 blur-lg"></div>
                </div>

                <h2 className="mt-4 text-2xl font-bold text-emerald-100">
                  {loginPage ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-emerald-300/70">
                  {loginPage
                    ? "Login to continue your journey"
                    : "Join us and start your journey"}
                </p>
              </div>

              {/* FORM */}
              <div className="space-y-5">
                {!loginPage && (
                  <div>
                    <label className="text-sm text-emerald-200 mb-1 block">
                      Name
                    </label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition"
                      />
                    </div>
                  </div>
                )}

                {/* EMAIL */}
                <div>
                  <label className="text-sm text-emerald-200 mb-1 block">
                    Email
                  </label>
                  <div className="relative">
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="johndoe@gmail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="text-sm text-emerald-200 mb-1 block">
                    Password
                  </label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition"
                    />
                  </div>
                </div>

                {/* BUTTON */}
                {!!loginPage ? (
                  <button
                    onClick={handleLogin}
                    // disabled={isLoggingIn}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-green-500 transition disabled:opacity-60"
                  >
                    Log in
                  </button>
                ) : (
                  <button
                    onClick={handleRegister}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 font-semibold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-green-500 transition disabled:opacity-60"
                  >
                    Register
                  </button>
                )}
              </div>

              {/* FOOTER */}
              <div className="mt-6 text-center text-emerald-300/80">
                {loginPage ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => setLoginPage(false)}
                      className="text-emerald-400 hover:text-emerald-300 underline-offset-4 hover:underline"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => setLoginPage(true)}
                      className="text-emerald-400 hover:text-emerald-300 underline-offset-4 hover:underline"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className={`md:w-1/2 ${
              loginPage ? "" : "md:order-1"
            } hidden md:flex items-center justify-center relative bg-gradient-to-tr from-emerald-800/20 to-transparent`}
          >
            <div className="absolute inset-0 bg-emerald-500/5"></div>
            <div className="relative z-10 text-center">
              <img
                src={loginPage ? "/login.png" : "/signup.png"}
                alt={loginPage ? "Login Illustration" : "Signup Illustration"}
                className="max-h-[380px] drop-shadow-2xl"
              />

              <h3 className="mt-6 text-xl font-semibold bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                {loginPage ? "Connect Anytime, Anywhere" : "Join Our Community"}
              </h3>

              <div className="mt-4 flex justify-center gap-3">
                {loginPage
                  ? ["Free", "Secure", "Fast"].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-sm bg-emerald-500/10 border border-emerald-400/30 text-emerald-300"
                      >
                        {tag}
                      </span>
                    ))
                  : ["Easy Setup", "24/7 Support", "Privacy First"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-sm bg-green-500/10 border border-green-400/30 text-green-300"
                        >
                          {tag}
                        </span>
                      )
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
