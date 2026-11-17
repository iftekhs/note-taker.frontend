import { LoaderCircle } from 'lucide-react';

export default function ListLoader({ label }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" />
      {label}
    </p>
  );
}
