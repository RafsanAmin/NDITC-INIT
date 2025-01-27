import React, { forwardRef, useState } from "react";

const CheckBox = (
  props: React.HTMLProps<HTMLInputElement> & {
    divClass?: string;
    labelText?: React.ReactNode;
  },
  ref: any,
) => {
  const [isOnFocus, setFocus] = useState(false);
  return (
    <div className={"inline-flex items-center " + props.divClass}>
      <label
        className="relative flex cursor-pointer items-center"
        htmlFor="check-with-link"
      >
        <input
          ref={ref}
          {...props}
          type="checkbox"
          className={
            "peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-primary-150/80 shadow transition-all checked:border-primary-350 checked:bg-primary-350 hover:shadow-md " +
            props.className
          }
          id="check-with-link"
        />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-white opacity-0 peer-checked:opacity-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            stroke="currentColor"
            stroke-width="1"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </span>
      </label>
      <label className="ml-2 cursor-pointer text-sm" htmlFor="check-with-link">
        {props.labelText}
      </label>
    </div>
  );
};

export default forwardRef(CheckBox);
