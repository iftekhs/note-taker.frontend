import { Alert, AlertDescription, AlertTitle } from './ui/alert.jsx';

export default function FormError({ message }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>Request failed</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
