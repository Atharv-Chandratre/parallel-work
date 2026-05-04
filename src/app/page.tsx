"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import CalendarView from "@/components/CalendarView";
import Toasts from "@/components/Toasts";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import { useUiStore } from "@/store/uiStore";

export default function Home() {
  const viewMode = useUiStore((s) => s.viewMode);
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main id="board" className="flex flex-1 overflow-hidden">
        {viewMode === "calendar" ? <CalendarView /> : <Board />}
      </main>
      <ShortcutsHelp />
      <Toasts />
    </div>
  );
}
