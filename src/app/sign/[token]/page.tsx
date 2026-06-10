import { notFound } from 'next/navigation';

/** Signing is handled via SignWell email links — this route is not used. */
export default function ClientSignPortal() {
  notFound();
}
