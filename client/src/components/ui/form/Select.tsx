import React, { useEffect, useState } from "react";
import { MdOutlineChevronLeft } from "react-icons/md";

const Select = (props: {
  values: any[];
  labels?: string[];
  divClass?: string;
  defaultValue?: any;
  name?: string;
  label?: string;
  required?: boolean;
  onChange?: (val: any, idx?: number) => void;
}) => {
  const [currentOption, setCurrentOption] = useState(0);
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    if (props.defaultValue) {
      setCurrentOption(props.values.indexOf(props.defaultValue));
    }
  }, [props.defaultValue, props.values]);
  return (
    <div className={"relative " + props.divClass}>
      <input
        type="text"
        hidden
        name={props.name}
        value={props.values[currentOption]}
      />
      <div
        onClick={() => setOpen((s) => !s)}
        className="relative w-full cursor-pointer resize-none scroll-pt-7 rounded-full bg-gradient-to-r from-secondary-400/50 to-secondary-600 px-8 pb-3 pt-7 transition placeholder:text-transparent autofill:bg-transparent autofill:bg-gradient-to-r autofill:from-secondary-400 autofill:to-secondary-500 hover:opacity-85"
      >
        <div>{(props.labels || props.values)[currentOption]}</div>
        <label
          htmlFor={props.name}
          className={`pointer-events-none absolute left-8 top-5 z-10 -translate-y-1/2 text-sm text-white/50 transition-all`}
        >
          {props.label}{" "}
          <span className="text-red-400">{props.required ? "*" : ""}</span>
        </label>
        <span className="absolute right-8 top-1/2 -translate-y-1/2">
          <MdOutlineChevronLeft
            className={"text-xl transition " + (isOpen ? "-rotate-90" : "")}
          />
        </span>
      </div>{" "}
      <ul
        className={`absolute left-0 top-[117%] z-20 max-h-[250px] w-full origin-top overflow-y-auto overflow-x-clip rounded-[1.75rem] bg-gradient-to-r from-secondary-600 to-secondary-700 p-4 transition ${isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
      >
        {(props.labels || props.values).map((s, index) => {
          return (
            <li
              onClick={() => {
                setCurrentOption(index);
                setOpen(false);
                props.onChange && props.onChange(props.values[index], index);
              }}
              className={
                "cursor-pointer rounded-2xl px-4 py-3 text-white/80 hover:bg-primary-400/80 " +
                (index === currentOption ? "bg-primary-350/80" : "")
              }
              key={index}
            >
              {s}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Select;
