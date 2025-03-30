import { Metadata } from "next";
import { SecuritySettings } from "../../../../../components/security"

export const metadata: Metadata = {
  title: "Avenire - Security Settings",
  description: "Avenire",
};

const SecurityPage = () => {
  return (
    <div className="flex flex-col">
      <div className="mx-auto max-w-3xl">
        <SecuritySettings />
      </div>
    </div >
  )
}

export default SecurityPage