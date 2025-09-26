import { printProperty } from "./DataDisplay";

export function MessageSection({ message }: { message: string }) {
  return (
    <div className="col-span-full mx-20 p-4 rounded-lg bg-white border-2 border-black overflow-auto">
      {printProperty("Message", message)}
    </div>
  );
}
