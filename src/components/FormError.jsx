import { Alert, AlertDescription, AlertTitle } from './ui/alert.jsx';

/** Consistent inline error surface for failed API calls. */
export default function FormError({ message }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>Request failed</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
