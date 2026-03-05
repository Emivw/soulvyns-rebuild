import { redirect } from 'next/navigation';

export default function FindCounselorRedirect() {
  // Simple server-side redirect to the existing counselors listing
  redirect('/counselors');
}

