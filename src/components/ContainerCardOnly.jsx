import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';


const ContainerCardOnly = ({children}) => {
    return (
        <div>
            <Card>
                <CardBody className="" style={{}}>
                    <>{children}</>
                </CardBody>
            </Card>
        </div>
    )
}

export default ContainerCardOnly