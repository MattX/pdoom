import { useEffect, useState, useCallback } from "react";
import { api } from "./api";
import type { User, Estimate } from "./types";
import CurrentEstimates from "./components/CurrentEstimates";
import EstimateForm from "./components/EstimateForm";
import HistoryChart from "./components/HistoryChart";
import EstimateLog from "./components/EstimateLog";
import MetaculusPanel from "./components/MetaculusPanel";

export default function App() {
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    const [{ users }, { estimates }] = await Promise.all([
      api.users(),
      api.estimates(),
    ]);
    setUsers(users);
    setEstimates(estimates);
  }, []);

  useEffect(() => {
    api.me().then(({ user }) => setMe(user));
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    setMe(null);
  };

  const handleSubmitted = () => {
    setShowForm(false);
    loadData();
  };

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const errorParam = new URLSearchParams(window.location.search).get("error");

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">☠️</span>
            <span className="font-bold text-gray-100 tracking-tight">p(doom)</span>
          </div>
          <div className="flex items-center gap-3">
            {me ? (
              <>
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  {showForm ? "Cancel" : "+ Update"}
                </button>
                <div className="flex items-center gap-2">
                  {me.picture && (
                    <img src={me.picture} className="w-7 h-7 rounded-full" alt="" />
                  )}
                  <span className="text-sm text-gray-300 hidden sm:block">{me.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <a
                href="/auth/google"
                className="text-sm bg-white hover:bg-gray-100 text-gray-900 px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {errorParam && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 text-sm">
            Login error: {errorParam.replace(/_/g, " ")}
          </div>
        )}

        {showForm && me && (
          <EstimateForm onSubmitted={handleSubmitted} />
        )}

        <CurrentEstimates
          estimates={estimates}
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />

        <HistoryChart
          estimates={estimates}
          users={users}
          selectedUser={selectedUser}
        />

        <MetaculusPanel />

        <EstimateLog estimates={estimates} selectedUser={selectedUser} />
      </main>
    </div>
  );
}
