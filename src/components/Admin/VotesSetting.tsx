export default function VoteSetting() {
  return (
    <div className="flex w-full flex-col gap-6">
      <button className="btn btn-primary">Start Votes</button>
      <button className="btn btn-secondary">Stop Votes</button>
      <button className="btn btn-error">Reset Data</button>
    </div>
  );
}
