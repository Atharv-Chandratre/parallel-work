"use client";

import Header from "@/components/Header";
import Board from "@/components/Board";

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main id="board" className="flex flex-1 overflow-hidden">
        <Board />
      </main>
    </div>
  );
}
