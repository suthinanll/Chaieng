"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { supabase } from "../lib/supabase";
import LoginScreen from "../components/LoginScreen";
import WalletTab from "../components/WalletTab";
import TasksTab from "../components/TasksTab";
import ScheduleTab from "../components/ScheduleTab";
import DiaryTab from "../components/DiaryTab";

type Tab = "wallet" | "tasks" | "schedule" | "diary";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "wallet",
    label: "ระบบการเงิน",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: "tasks",
    label: "รายการงาน",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "กำหนดการ",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: "diary",
    label: "บันทึกส่วนตัว",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("wallet");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const applyTheme = (nextValue: boolean) => {
    document.documentElement.classList.toggle("dark", nextValue);
    document.documentElement.style.colorScheme = nextValue ? "dark" : "light";
    document.documentElement.setAttribute(
      "data-theme",
      nextValue ? "dark" : "light",
    );
  };

  useLayoutEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const nextValue =
      savedTheme === "light"
        ? false
        : savedTheme === "dark"
          ? true
          : systemPrefersDark;

    setIsDarkMode(nextValue);
    applyTheme(nextValue);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    applyTheme(nextVal);
    window.localStorage.setItem("theme", nextVal ? "dark" : "light");
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfileMenu(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert("ออกจากระบบไม่สำเร็จ: " + message);
    }
  };

  /* ── Loading state ── */
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-yellow-400/30 animate-ping" />
            <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-white">
              <img src="/icon.png" alt="" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">
            กำลังเตรียมพร้อม...
          </p>
        </div>
      </div>
    );
  }

  /* ── Not logged in ── */
  if (!session) {
    return (
      <div className={isDarkMode ? "dark" : ""}>
        <LoginScreen />
      </div>
    );
  }

  /* ── Authenticated ── */
  const user = session.user;
  const userEmail = user?.email || "user@example.com";
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "ผู้ใช้งาน";

  const renderTabContent = () => {
    switch (activeTab) {
      case "wallet":
        return <WalletTab userId={user.id} />;
      case "tasks":
        return <TasksTab userId={user.id} />;
      case "schedule":
        return <ScheduleTab userId={user.id} />;
      case "diary":
        return <DiaryTab userId={user.id} />;
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 moving-gradient-bg ${isDarkMode ? "text-slate-100 dark" : "text-slate-900"}`}
    >
      {/* ══════════════════════════════════════════════════════════
          Desktop Sidebar Navigation (≥1024px)
         ══════════════════════════════════════════════════════════ */}
      <aside className="sidebar-nav hidden lg:flex flex-col border-r border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl transition-colors">
        {/* Sidebar Logo */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-200/60 dark:border-slate-800/60">
          <img
            src={isDarkMode ? "/lightlogo.svg" : "/darklogo.svg"}
            alt="Logo"
            className="block h-11 w-auto object-contain"
          />
        </div>

        {/* Sidebar Tab Buttons */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sidebar-${tab.id}-btn`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                    ? "bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
              >
                <div
                  className={`transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                >
                  {tab.icon}
                </div>
                <span>{tab.label}</span>
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-yellow-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Theme toggle + Profile */}
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-4 space-y-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            {isDarkMode ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
            <span>{isDarkMode ? "โหมดสว่าง" : "โหมดมืด"}</span>
          </button>

          {/* Profile */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
            {userAvatar && !avatarFailed ? (
              <img
                src={userAvatar}
                alt={userName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-9 w-9 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-xs font-bold text-white dark:text-slate-900 uppercase shrink-0">
                {userEmail[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {userName}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="ออกจากระบบ"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          Main Content Area (shifts right on desktop for sidebar)
         ══════════════════════════════════════════════════════════ */}
      <div className="main-with-sidebar">
        {/* ── Top Header (mobile + tablet only) ── */}
        <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-slate-900/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors lg:hidden">
          <div className="content-container flex h-14 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-1 h-16 border-b border-slate-200/60 dark:border-slate-800/60">
              <img
                src={isDarkMode ? "/lightlogo.svg" : "/darklogo.svg"}
                alt="Logo"
                className="block h-10 w-auto object-contain"
              />
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle (mobile) */}
              <button
                onClick={toggleTheme}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                {isDarkMode ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  id="profile-menu-btn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-1 pr-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  {userAvatar && !avatarFailed ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                      className="h-6 w-6 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center text-[10px] font-bold text-white dark:text-slate-900 uppercase">
                      {userEmail[0]}
                    </div>
                  )}
                  <svg
                    className="h-3 w-3 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 z-50 w-60 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl animate-scale-up">
                      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                        {userAvatar && !avatarFailed ? (
                          <img
                            src={userAvatar}
                            alt={userName}
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarFailed(true)}
                            className="h-10 w-10 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-sm font-bold text-white dark:text-slate-900 uppercase shrink-0">
                            {userEmail[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {userName}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {userEmail}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white py-2.5 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        ออกจากระบบ
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Desktop Top Bar ── */}
        <header className="hidden lg:block sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
          <div className="content-container flex h-14 items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              title={isDarkMode ? "สลับโหมดสว่าง" : "สลับโหมดมืด"}
            >
              {isDarkMode ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="content-container pt-5">{renderTabContent()}</main>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Bottom Tab Navigation (mobile + tablet only)
         ══════════════════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 dark:border-slate-900/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl transition-colors lg:hidden">
        <div className="content-container grid grid-cols-4 h-18 px-1 items-center">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}-btn`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-full flex-col items-center justify-center gap-1.5 relative transition-all duration-200 py-2 cursor-pointer ${isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-yellow-400" />
                )}
                <div
                  className={`transition-transform duration-200 [&>svg]:w-5 [&>svg]:h-5 ${isActive ? "scale-110 text-yellow-500 dark:text-yellow-400" : ""
                    }`}
                >
                  {tab.icon}
                </div>
                <span
                  className={`text-[10px] tracking-wide font-medium transition-all ${isActive ? "font-bold" : ""
                    }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}