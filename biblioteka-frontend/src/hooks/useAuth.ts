import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";

export default function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
