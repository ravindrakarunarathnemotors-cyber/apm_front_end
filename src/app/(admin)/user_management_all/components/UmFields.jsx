"use client";

import React from "react";
import { Icon } from "@iconify/react";

// Shared form pieces (styles are in UmCard). They live at module level: a component defined inside another one is re-created on every
// key press and the input would lose its focus.
export const Field = ({ label, icon, error, hint, right, children, wide }) => (
  <div className={`au-field ${wide ? "au-wide" : ""}`}>
    <label className="au-label">{label}</label>
    <div className={`au-wrap ${error ? "au-bad" : ""}`}>
      {icon ? <Icon icon={icon} className="au-ico" width="19" height="19" /> : null}
      {children}
      {right}
    </div>
    {error ? <div className="au-err">{error}</div> : hint ? <div className="au-hint">{hint}</div> : null}
  </div>
);

export const Section = ({ no, title, sub, children, plain }) => (
  <section className="au-sec">
    <div className="au-sec-h"><span className="au-no">{no}</span><div><div className="au-sec-t">{title}</div><div className="au-sec-s">{sub}</div></div></div>
    {plain ? children : <div className="au-grid">{children}</div>}
  </section>
);