export default function SubsidiesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>)}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex gap-2 mb-3">{[...Array(3)].map((_, j) => <div key={j} className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>)}</div>
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
