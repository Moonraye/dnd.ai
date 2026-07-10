import Link from "next/link";
import { Header } from "@/widgets/header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <h1 className="text-4xl font-bold">DunDrAI</h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Real-time multiplayer D&amp;D with AI dungeon masters and party
          members.
        </p>
        <Link
          href="/signup"
          className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Start your adventure
        </Link>
      </main>
    </>
  );
}
