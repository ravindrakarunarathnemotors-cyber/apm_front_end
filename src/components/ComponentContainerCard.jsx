import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
const ComponentContainerCard = ({
  status  = '',
  title,
  children
}) => {
  return <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col style={{backgroundColor: status === 'receive' ? '#eab02b' : status === 'transfer' ? '#003366' : status === 'return' ? '#8B0000' : '#e5e8ed', color: status === 'receive' ? 'white' : status === 'transfer' ? 'white' : status === 'return' ? 'white' :'black'}} className={`py-2 `}>
            <CardTitle className='fs-4'>{title}</CardTitle>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0" style={{}}>
        <>{children}</>
      </CardBody>
    </Card>;
};
export default ComponentContainerCard;