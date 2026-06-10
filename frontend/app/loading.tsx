export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 text-sm">読み込み中...</p>
      </div>
    </div>
  );
}
