import { getKeys } from "./actions/keys";
import { KeyDashboard } from "../components/key-dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const keys = await getKeys();

  return <KeyDashboard initialKeys={keys} />;
}