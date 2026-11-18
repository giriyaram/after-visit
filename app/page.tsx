import {redirect} from 'next/navigation';

// Staff start at the inbox, which sends them to sign in if they need to.
// Patients have no entry here: they arrive through their private link.
export default function Home() {
  redirect('/inbox');
}
