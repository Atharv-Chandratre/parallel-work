"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";
import Toasts from "@/components/Toasts";
import ShortcutsHelp from "@/components/ShortcutsHelp";

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main id="board" className="flex flex-1 overflow-hidden">
        <Board />
      </main>
      <ShortcutsHelp />
      <Toasts />
    </div>
  );
}
