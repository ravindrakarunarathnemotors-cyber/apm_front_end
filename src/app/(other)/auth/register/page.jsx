"use client"; // Ensure it's a Client Component

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import RegisterForm from "./components/RegisterForm";
import { Card, CardBody, Col } from "react-bootstrap";

const Register = () => {
  const [logoSmImg, setLogoSmImg] = useState("/default-logo.png"); // Default logo

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSettings = localStorage.getItem("brandingSettings"); // Get full object
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings); // Parse JSON
        if (parsedSettings.logo_url) {
          setLogoSmImg(parsedSettings.logo_url); // Correctly access `logo_url`
        }
      }
    }
  }, []);
  return <Col lg={4} className="mx-auto">
      <Card>
        <CardBody className="p-0 bg-black auth-header-box rounded-top">
          <div className="text-center p-3">
            <Link href="/" className="logo logo-admin">
              <Image src={logoSmImg} height={50} width={100} alt="logo" className="auth-logo" />
            </Link>
            <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Create an account</h4>
            <p className="text-muted fw-medium mb-0">Enter your detail to Create your account today.</p>
          </div>
        </CardBody>
        <CardBody className="pt-0">
          <RegisterForm />

          <div className="text-center">
            <p className="text-muted">
              Already have an account ?
              <Link href="/auth/login" className="text-primary ms-2">
                Log in
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </Col>;
};
export default Register;