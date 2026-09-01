import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">What do you want to accommodate?</h1>
      <div className="flex gap-4">
        <Link
          href="/materials/new?kind=lesson_plan"
          className="rounded-md border border-gray-300 px-6 py-4 text-left font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Lesson Plan
        </Link>
        <Link
          href="/materials/new?kind=material"
          className="rounded-md border border-gray-300 px-6 py-4 text-left font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Assignment / Material
        </Link>
      </div>
    </div>
  );
}
