import Image from 'next/image';
import Link from 'next/link';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import unauthorizedImg from '@/assets/images/extra/card/unauthorized.png';
import { Card, CardBody, Col } from 'react-bootstrap';
export const metadata = {
    title: 'Maintenance'
};
const Unauthorized = () => {
    return <Col lg={6} className="mx-auto">
        <Card>
            <CardBody className="p-5">
                <div className="text-center">
                    <Image src={unauthorizedImg} alt="maintenance" className="img-fluid mb-3" />
                    <h6 className="mb-2 fw-medium text-dark fs-24">Unauthorized Access</h6>
                    <p className="text-muted mb-0 text-wrap fs-15">You do not have permission to view this page. Please contact your administrator if you believe this is a mistake.</p>

                    <div className="mt-3 text-center">
                        <Link className="btn btn-danger w-50" href="/welcome_to_client">
                            Back to Dashboard <IconifyIcon icon="fa:redo" className="ms-1" />
                        </Link>
                    </div>
                </div>
            </CardBody>
        </Card>
    </Col>;
};
export default Unauthorized;