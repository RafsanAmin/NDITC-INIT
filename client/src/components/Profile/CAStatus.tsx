"use client";
import Link from "next/link";
import React from "react";
import { BiCopy, BiCopyAlt } from "react-icons/bi";
import {
  FaCheckCircle,
  FaRegClock,
  FaCopy,
  FaRegStar,
  FaExternalLinkAlt,
  FaLink,
} from "react-icons/fa";
import { IoMdCode } from "react-icons/io";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface CAStatusProps {
  user: {
    hasAppliedForCA: boolean;
    isApproved: boolean;
    caCode?: string;
    points?: number;
  };
}

const CAStatus: React.FC<CAStatusProps> = ({ user }) => {
  const { hasAppliedForCA, isApproved, caCode, points } = user;

  const handleApplyForCA = () => {
    toast.info("Redirecting to CA application page...");
  };

  const handleCopyCode = () => {
    if (caCode) {
      navigator.clipboard.writeText(caCode);
      toast.success("CA Code copied to clipboard!");
    }
  };

  const StatusMessage = ({ icon, message, additionalContent }: any) => (
    <div className="flex flex-col items-center gap-4">
      {icon}
      <p className="text-center text-lg text-white/70">{message}</p>
      {additionalContent}
    </div>
  );

  const ApprovedContent = () => (
    <div className="bg-primary-700 flex w-full flex-col items-center justify-between gap-4 rounded-lg px-4 py-2 text-secondary-200 md:flex-row">
      <div className="w-full rounded-lg bg-secondary-500/20 p-6 text-center">
        <strong>
          <FaRegStar className="icn-inline mr-2 text-primary-300" />
          Points:
        </strong>{" "}
        <br></br> <span className="text-xl text-white/80">{points}</span>
      </div>
      <div className="w-full rounded-lg bg-secondary-500/20 p-6 text-center">
        <strong>
          <FaLink className="icn-inline mr-2 text-primary-300" />
          Messenger Group Join Link:
        </strong>{" "}
        <br></br>{" "}
        <a
          target="_blank"
          href="https://l.messenger.com/l.php?u=https%3A%2F%2Fm.me%2Fj%2FAbbFhFOHI6Gho6cv%2F&h=AT2RfYRyACY43pX1mGZb_emkWpowoaAjEx1asuDeh-Z4kkv6LnKuZirWA6MmuHbSElWUatMVAZqRfe3XWeXeFPuZhY5Q8j8rBjYNkODniePdTVbyK202-nggX2IHPNV27gYang"
          className="pt-4 text-lg text-primary-300 underline"
        >
          <FaExternalLinkAlt className="icn-inline mr-2" />
          Click Here
        </a>
      </div>
      <div className="w-full rounded-lg bg-secondary-500/20 p-6 text-center text-primary-150">
        <strong>
          <IoMdCode className="icn-inline mr-2 text-primary-300" />
          CA Code:
        </strong>{" "}
        <br></br>
        <span className="text-xl text-white/80">{caCode}</span>
        <button
          onClick={handleCopyCode}
          className="ml-2 text-primary-150 transition-colors hover:text-secondary-100"
        >
          <BiCopy className="text-xl" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="my-2 w-full rounded-2xl border-white/5 bg-gradient-to-br from-secondary-700 to-secondary-500/20 p-6 text-primary-200 backdrop-blur-md">
      <p className="mb-4 text-center text-3xl font-bold text-secondary-200">
        CA Status
      </p>

      {!hasAppliedForCA ? (
        <StatusMessage
          message="You have not applied for the CA program yet."
          additionalContent={
            <Link
              href="/apply/ca"
              className="rounded-lg bg-secondary-300 px-6 py-2 text-primary-650 transition-colors hover:bg-secondary-200"
            >
              Apply for CA
            </Link>
          }
        />
      ) : !isApproved ? (
        <StatusMessage
          icon={<FaRegClock className="text-4xl text-primary-400" />}
          message="Your CA application is pending approval. Please wait for the admins to review your application."
        />
      ) : (
        <StatusMessage
          icon={<FaCheckCircle className="text-4xl text-primary-400" />}
          message="Congratulations! Your CA application has been approved. If you want to earn points as CA then Participants must use the provided code to register on this site."
          additionalContent={<ApprovedContent />}
        />
      )}
    </div>
  );
};

export default CAStatus;
