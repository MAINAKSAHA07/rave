export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="flex flex-col items-center justify-center">
        <img
          src="/Powerglide_final-logo.png"
          alt="Loading"
          width={200}
          height={200}
          className="animate-pulse"
        />
      </div>
    </div>
  );
}

