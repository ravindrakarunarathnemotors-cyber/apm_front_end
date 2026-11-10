"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useAddUserMutation,
  useGetRolesMutation,
  useGetBranchesMutation, // <-- aluth (apiSlice ekata add karanna)
  useCheckUsernameMutation,
} from "@/store/features/apiSlice";
import { Button, Col, Form, FormControl, FormLabel, FormSelect, Row } from "react-bootstrap";
import UmCard from "./UmCard";
import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import useAuthRetry from "./authRetry";
import { debounce } from "lodash";

const schema = yup.object({
  username: yup
    .string()
    .matches(/^[A-Za-z0-9._-]{3,30}$/, "3 to 30 letters, numbers, . _ - (no spaces)")
    .required("Username is required"),
  // letters of any language, spaces and . ' -   (K.M. Perera, De-Silva, D'Souza)
  firstName: yup
    .string()
    .matches(/^[\p{L}\s.'-]+$/u, "First name can only contain letters")
    .required("First Name is required"),
  lastName: yup
    .string()
    .matches(/^[\p{L}\s.'-]+$/u, "Last name can only contain letters")
    .required("Last Name is required"),
  nic: yup
    .string()
    .matches(
      /^(\d{9}[VvXx]|\d{12})$/,
      "Invalid NIC (old: 9 digits + V/X, new: 12 digits)"
    )
    .required("NIC is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone: yup
    .string()
    .matches(/^(07\d{8}|947\d{8}|7\d{8})$/, "Enter 07XXXXXXXX or 947XXXXXXXX")
    .required("Phone is required"),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Confirm the password"),
  role: yup.string().required("Role is required"),
  branch: yup.string().required("Branch is required"),
});

// (defined outside the form component: a component defined inside it would be re-created on every key press and the input would lose its focus)
// one field: label, icon, the control, and the error (or a hint) under it
const Field = ({ label, icon, error, hint, right, children, wide }) => (
  <div className={`au-field ${wide ? "au-wide" : ""}`}>
    <label className="au-label">{label}</label>
    <div className={`au-wrap ${error ? "au-bad" : ""}`}>
      <Icon icon={icon} className="au-ico" width="19" height="19" />
      {children}
      {right}
    </div>
    {error ? <div className="au-err">{error}</div> : hint ? <div className="au-hint">{hint}</div> : null}
  </div>
);
const Section = ({ no, title, sub, children }) => (
  <section className="au-sec">
    <div className="au-sec-h"><span className="au-no">{no}</span><div><div className="au-sec-t">{title}</div><div className="au-sec-s">{sub}</div></div></div>
    <div className="au-grid">{children}</div>
  </section>
);

export default function AddUserForm({ title = "Add New User", onSuccess }) {
  const [addUser, { isLoading: isAddingUser }] = useAddUserMutation();
  const [fetchRoles, { data: roles, isLoading: isRolesLoading, isError: isRolesError }] =
    useGetRolesMutation();
  const [
    fetchBranches,
    { data: branches, isLoading: isBranchesLoading, isError: isBranchesError },
  ] = useGetBranchesMutation();
  const [checkUsername] = useCheckUsernameMutation();
  const { run } = useAuthRetry();
  const [usernameError, setUsernameError] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);   // the submit waits for the check
  const [showPw, setShowPw] = useState(false);

  // Session storage eken role_id & branch_id
  const [sessionRoleId, setSessionRoleId] = useState(null);
  const [sessionBranchId, setSessionBranchId] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({ resolver: yupResolver(schema), mode: "onChange" });

  // Admin (role_id = 1) nam branch select karanna puluwan
  const isAdmin = String(sessionRoleId) === "1";

  useEffect(() => {
    setSessionRoleId(sessionStorage.getItem("role_id"));
    setSessionBranchId(sessionStorage.getItem("branch_id"));
    fetchRoles();
    fetchBranches();
  }, []);

  // Admin nemei nam branch eka session eke branch_id ekata set karanna
  useEffect(() => {
    if (sessionRoleId !== null && !isAdmin && sessionBranchId) {
      setValue("branch", String(sessionBranchId), { shouldValidate: true });
    }
  }, [sessionRoleId, sessionBranchId, isAdmin, setValue]);

  const debouncedCheck = useMemo(
    () =>
      debounce(async (username) => {
        if (username.length > 2) {
          try {
            const response = await run(() => checkUsername(username).unwrap());
            setUsernameError(response.exists ? "Username already exists" : "");
          } catch {
            setUsernameError("");      // the server checks again when the user is saved
          } finally {
            setUsernameChecking(false);
          }
        } else {
          setUsernameError("");
          setUsernameChecking(false);
        }
      }, 500),
    [checkUsername]
  );

  useEffect(() => {
    return () => debouncedCheck.cancel();
  }, [debouncedCheck]);

  const usernameField = register("username");

  const showError = (title, text) =>
    Swal.fire({ title, text, icon: "error", confirmButtonText: "OK" });

  const handleSuccess = () => {
    Swal.fire({
      title: "Success!",
      text: "User added successfully!",
      icon: "success",
      confirmButtonText: "OK",
    });
    reset();
    setUsernameError("");
    // reset() ekata passe admin nemei nam branch eka ayeth set karanna
    if (!isAdmin && sessionBranchId) {
      setValue("branch", String(sessionBranchId));
    }
    onSuccess?.();
  };

  const onSubmit = async (data) => {
    if (usernameError || usernameChecking) return;

    // the server takes the logged-in user (and, for a branch user, the branch) from the token; nothing about "who I am" is sent from here
    const { confirmPassword, ...rest } = data;
    const requestdata = { ...rest, branch: isAdmin ? data.branch : undefined };

    try {
      const response = await run(() => addUser(requestdata).unwrap());
      if (response.message === "sameuser") showError("Username Exist", "Same User Found");
      else handleSuccess();
    } catch (err) {
      console.error("Error adding user:", err);
      showError("Error", err?.data?.message || "Failed to add user. Please try again.");
    }
  };

  const pw = watch("password") || "";
  const uname = watch("username") || "";
  const strength = [pw.length >= 8, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const strengthLabel = !pw ? "" : ["Weak", "Weak", "Fair", "Good", "Strong"][strength];
  const usernameState = usernameChecking ? "checking" : usernameError ? "taken" : uname.length > 2 && !errors.username ? "ok" : "";
  const roleList = (roles || []).filter((role) => isAdmin || Number(role.id) !== 1);

  return (
    <UmCard title={title}>
      <style>{`
        .au-sec { padding: 4px 0 18px; margin-bottom: 18px; border-bottom: 1px solid #f0f0f2; }
        .au-sec:last-of-type { border-bottom: 0; margin-bottom: 0; }
        .au-sec-h { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .au-no { width: 30px; height: 30px; border-radius: 50%; background: #111; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: .85rem; box-shadow: inset 0 -3px 0 #c8102e; flex: 0 0 30px; }
        .au-sec-t { font-weight: 800; color: #111; line-height: 1.2; }
        .au-sec-s { font-size: .8rem; color: #71717a; }
        .au-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
        .au-wide { grid-column: 1 / -1; }
        @media (max-width: 767px) { .au-grid { grid-template-columns: 1fr; } }
        .au-label { display: block; font-weight: 600; font-size: .85rem; color: #111; margin-bottom: 6px; }
        .au-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1.5px solid #d4d4d8; border-radius: 12px; transition: border-color .15s, box-shadow .15s; }
        .au-wrap:focus-within { border-color: #c8102e; box-shadow: 0 0 0 .2rem rgba(200,16,46,.12); }
        .au-wrap.au-bad { border-color: #dc2626; }
        .au-ico { position: absolute; left: 13px; color: #a1a1aa; pointer-events: none; }
        .au-wrap:focus-within .au-ico { color: #c8102e; }
        .au-ctl { width: 100%; min-height: 46px; border: 0; background: transparent; padding: 0 14px 0 42px; border-radius: 12px; outline: 0; font-size: .95rem; color: #111; }
        select.au-ctl { appearance: auto; padding-right: 8px; }
        select.au-ctl:disabled, .au-ctl:disabled { color: #71717a; background: #f6f6f7; }
        .au-right { display: flex; align-items: center; padding-right: 10px; gap: 6px; flex: 0 0 auto; }
        .au-eye { border: 0; background: transparent; color: #71717a; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; }
        .au-eye:hover { background: #f4f4f5; color: #111; }
        .au-err { color: #dc2626; font-size: .8rem; margin-top: 5px; }
        .au-hint { color: #71717a; font-size: .8rem; margin-top: 5px; }
        .au-state { font-size: .8rem; font-weight: 600; white-space: nowrap; }
        .au-state.ok { color: #157347; } .au-state.taken { color: #dc2626; } .au-state.checking { color: #71717a; }
        .au-meter { display: flex; gap: 4px; margin-top: 8px; align-items: center; }
        .au-meter i { flex: 1; height: 5px; border-radius: 4px; background: #e4e4e7; }
        .au-meter i.on1 { background: #dc2626; } .au-meter i.on2 { background: #f59e0b; } .au-meter i.on3 { background: #84cc16; } .au-meter i.on4 { background: #157347; }
        .au-meter span { font-size: .75rem; font-weight: 700; color: #52525b; min-width: 48px; text-align: right; }
        .au-foot { display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; margin-top: 6px; border-top: 1px solid #f0f0f2; }
      `}</style>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Section no="1" title="Sign-in" sub="The username and password this person logs in with">
          <Field label="Username" icon="mdi:account-outline" error={errors.username?.message || usernameError} hint="3 to 30 letters, numbers, . _ -"
            right={usernameState ? <span className="au-right"><span className={`au-state ${usernameState}`}>{{ checking: "Checking...", ok: "Available", taken: "Taken" }[usernameState]}</span></span> : null}>
            <input className="au-ctl" type="text" autoComplete="off" placeholder="e.g. kasun.p" {...usernameField}
              onChange={(e) => { usernameField.onChange(e); const v = e.target.value.trim(); setUsernameChecking(v.length > 2); debouncedCheck(v); }} />
          </Field>
          <div />
          <Field label="Password" icon="mdi:lock-outline" error={errors.password?.message}
            right={<span className="au-right"><button type="button" className="au-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}><Icon icon={showPw ? "mdi:eye-off-outline" : "mdi:eye-outline"} width="19" height="19" /></button></span>}>
            <input className="au-ctl" type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" {...register("password")} />
          </Field>
          <Field label="Confirm password" icon="mdi:lock-check-outline" error={errors.confirmPassword?.message}>
            <input className="au-ctl" type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter the password" {...register("confirmPassword")} />
          </Field>
          {pw ? (
            <div className="au-wide au-meter" aria-label={`Password strength: ${strengthLabel}`}>
              {[1, 2, 3, 4].map((n) => <i key={n} className={strength >= n ? `on${strength}` : ""} />)}
              <span>{strengthLabel}</span>
            </div>
          ) : null}
        </Section>

        <Section no="2" title="Personal details" sub="Name and NIC">
          <Field label="First name" icon="mdi:card-account-details-outline" error={errors.firstName?.message}>
            <input className="au-ctl" type="text" placeholder="First name" {...register("firstName")} />
          </Field>
          <Field label="Last name" icon="mdi:card-account-details-outline" error={errors.lastName?.message}>
            <input className="au-ctl" type="text" placeholder="Last name" {...register("lastName")} />
          </Field>
          <Field label="NIC" icon="mdi:card-text-outline" error={errors.nic?.message} hint="901234567V or 199012345678">
            <input className="au-ctl" type="text" placeholder="NIC number" {...register("nic")} />
          </Field>
        </Section>

        <Section no="3" title="Contact" sub="Mobile number and e-mail">
          <Field label="Mobile number" icon="mdi:phone-outline" error={errors.phone?.message} hint="07XXXXXXXX or 947XXXXXXXX">
            <input className="au-ctl" type="tel" inputMode="numeric" placeholder="07XXXXXXXX" {...register("phone")} />
          </Field>
          <Field label="Email" icon="mdi:email-outline" error={errors.email?.message}>
            <input className="au-ctl" type="email" placeholder="name@example.com" {...register("email")} />
          </Field>
        </Section>

        <Section no="4" title="Access" sub="What this person can do, and where">
          <Field label="Role" icon="mdi:shield-account-outline" error={errors.role?.message}>
            <select className="au-ctl" {...register("role")}>
              <option value="">Select role</option>
              {isRolesLoading && <option disabled>Loading roles...</option>}
              {isRolesError && <option disabled>Error loading roles</option>}
              {roleList.map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)}
            </select>
          </Field>
          <Field label="Branch" icon="mdi:source-branch" error={errors.branch?.message} hint={!isAdmin ? "New users join your own branch" : undefined}>
            <select className="au-ctl" disabled={!isAdmin} {...register("branch")}>
              <option value="">Select branch</option>
              {isBranchesLoading && <option disabled>Loading branches...</option>}
              {isBranchesError && <option disabled>Error loading branches</option>}
              {branches?.map((branch) => <option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name}</option>)}
            </select>
          </Field>
        </Section>

        <div className="au-foot">
          <Button type="button" variant="secondary" disabled={isAddingUser} onClick={() => { reset(); setUsernameError(""); setUsernameChecking(false); if (!isAdmin && sessionBranchId) setValue("branch", String(sessionBranchId)); }}>Clear</Button>
          <Button type="submit" disabled={isAddingUser || usernameChecking || !!usernameError}>
            <Icon icon="material-symbols:group-add-rounded" width="22" height="22" /> {isAddingUser ? "Adding..." : "Add User"}
          </Button>
        </div>
      </form>
    </UmCard>
  );
}