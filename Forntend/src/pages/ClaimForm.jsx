import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Row, Col, DatePicker, Upload, Select, Radio, message } from 'antd';
import { UploadOutlined, ArrowLeftOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { submitClaimForm, getMeetingByClaimId } from '../services/api';
import Logo from '../assets/Logo.jpeg';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ClaimForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claimId');
  
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [meetingRoomId, setMeetingRoomId] = useState(null);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(values).forEach(key => {
        if (values[key] && key !== 'documents') {
          if (values[key]._isAMomentObject) {
            formData.append(key, values[key].format('YYYY-MM-DD'));
          } else {
            formData.append(key, values[key]);
          }
        }
      });

      // Add claim ID
      formData.append('claim_id', claimId);

      // Add documents
      fileList.forEach(file => {
        formData.append('documents', file.originFileObj);
      });

      const response = await submitClaimForm(formData, user.token);

      if (response.success) {
        message.success('Claim form submitted successfully! Redirecting to PDF preview...');
        // Navigate to PDF preview page
        setTimeout(() => {
          navigate(`/pdf-preview?claimId=${claimId}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error(error.message || 'Failed to submit claim form');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // Fetch meeting details to get room ID for rejoin
  useEffect(() => {
    const fetchMeetingDetails = async () => {
      if (claimId) {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const response = await getMeetingByClaimId(claimId, user.token);
          if (response.success && response.data.roomId) {
            setMeetingRoomId(response.data.roomId);
          }
        } catch (error) {
          console.error('Error fetching meeting details:', error);
        }
      }
    };
    fetchMeetingDetails();
  }, [claimId]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/home')}
            style={{
              background: 'rgba(255,255,255,0.3)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              height: '40px',
              fontWeight: 600,
            }}
          >
            Back to Home
          </Button>
          {meetingRoomId && (
            <Button
              icon={<VideoCameraOutlined />}
              onClick={() => navigate(`/meeting/${meetingRoomId}?role=doctor`)}
              style={{
                background: 'rgba(16, 185, 129, 0.9)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '40px',
                fontWeight: 600,
              }}
            >
              Rejoin Meeting
            </Button>
          )}
        </div>

        <Card style={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            <img src={Logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px' }} />
          </div>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '10px', color: '#667eea' }}>
            📋 Detailed Claim Form
          </Title>
          <Text style={{ display: 'block', textAlign: 'center', marginBottom: '30px', color: '#667eea', fontSize: '16px' }}>
            Claim ID: <strong style={{ color: '#764ba2' }}>{claimId}</strong>
          </Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            {/* Basic Information */}
            <Title level={4} style={{ color: '#667eea', marginTop: '20px', marginBottom: '20px' }}>📝 Basic Information</Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Patient Name"
                  name="patient_name"
                  rules={[{ required: true, message: 'Please enter patient name' }]}
                >
                  <Input placeholder="Enter patient name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Date of Joining"
                  name="doj"
                  rules={[{ required: true, message: 'Please select date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Patient Relationship"
                  name="patient_relationship"
                  rules={[{ required: true, message: 'Please select relationship' }]}
                >
                  <Select placeholder="Select relationship">
                    <Option value="self">Self</Option>
                    <Option value="spouse">Spouse</Option>
                    <Option value="child">Child</Option>
                    <Option value="parent">Parent</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Mobile Number"
                  name="mobile_number"
                  rules={[
                    { required: true, message: 'Please enter mobile number' },
                    { pattern: /^[0-9]{10}$/, message: 'Please enter valid 10 digit mobile number' }
                  ]}
                >
                  <Input placeholder="Enter mobile number" maxLength={10} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Insured Name"
                  name="insured_name"
                  rules={[{ required: true, message: 'Please enter insured name' }]}
                >
                  <Input placeholder="Enter insured name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Product"
                  name="product"
                  rules={[{ required: true, message: 'Please enter product' }]}
                >
                  <Input placeholder="Enter product/policy name" />
                </Form.Item>
              </Col>
            </Row>

            {/* Hospital Information */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>🏥 Hospital Information</Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Hospital Name"
                  name="hospital_name"
                  rules={[{ required: true, message: 'Please enter hospital name' }]}
                >
                  <Input placeholder="Enter hospital name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Hospital Location"
                  name="hospital_location"
                  rules={[{ required: true, message: 'Please enter hospital location' }]}
                >
                  <Input placeholder="Enter hospital location" />
                </Form.Item>
              </Col>
            </Row>

            {/* Patient Details */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>👤 Patient Details</Title>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Age"
                  name="age"
                  rules={[{ required: true, message: 'Please enter age' }]}
                >
                  <Input type="number" placeholder="Enter age" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Date of Admission"
                  name="date_of_admission"
                  rules={[{ required: true, message: 'Please select date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Date of Discharge"
                  name="date_of_discharge"
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label="Diagnosis"
                  name="diagnosis"
                  rules={[{ required: true, message: 'Please enter diagnosis' }]}
                >
                  <TextArea rows={3} placeholder="Enter diagnosis details" />
                </Form.Item>
              </Col>
            </Row>

            {/* Policy & Employment */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>📋 Policy & Employment</Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Policy Type"
                  name="policy_type"
                >
                  <Select placeholder="Select policy type">
                    <Option value="individual">Individual</Option>
                    <Option value="family_floater">Family Floater</Option>
                    <Option value="corporate">Corporate</Option>
                    <Option value="senior_citizen">Senior Citizen</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Employment Details"
                  name="employment_details"
                >
                  <Input placeholder="Enter employment details" />
                </Form.Item>
              </Col>
            </Row>

            {/* Informer Details */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>👥 Informer Details</Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Informer Name"
                  name="informer_name"
                >
                  <Input placeholder="Enter informer name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Informer Relation"
                  name="informer_relation"
                >
                  <Input placeholder="Enter relation with patient" />
                </Form.Item>
              </Col>
            </Row>

            {/* Medical Information */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>🩺 Medical Information</Title>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label="Patient Statement"
                  name="patient_statement"
                >
                  <TextArea rows={3} placeholder="Enter patient statement" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Current Status"
                  name="current_status"
                >
                  <Select placeholder="Select current status">
                    <Option value="admitted">Admitted</Option>
                    <Option value="discharged">Discharged</Option>
                    <Option value="under_treatment">Under Treatment</Option>
                    <Option value="recovered">Recovered</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Claim History"
                  name="claim_history"
                >
                  <Select placeholder="Previous claims">
                    <Option value="no">No Previous Claims</Option>
                    <Option value="yes">Has Previous Claims</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Other Health Insurance"
                  name="other_health_insurance"
                >
                  <Radio.Group>
                    <Radio value="yes">Yes</Radio>
                    <Radio value="no">No</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Treating Doctor"
                  name="treating_doctor"
                >
                  <Input placeholder="Enter doctor's name" />
                </Form.Item>
              </Col>
            </Row>

            {/* Hospital Stay Details */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>🛏️ Hospital Stay Details</Title>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Advance Paid"
                  name="advance_paid"
                >
                  <Input type="number" placeholder="Amount in ₹" prefix="₹" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Room Type"
                  name="room_type"
                >
                  <Select placeholder="Select room type">
                    <Option value="general">General Ward</Option>
                    <Option value="semi_private">Semi Private</Option>
                    <Option value="private">Private</Option>
                    <Option value="deluxe">Deluxe</Option>
                    <Option value="suite">Suite</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="ICU Stay"
                  name="icu_stay"
                >
                  <Input placeholder="Number of days" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tests Done"
                  name="tests_done"
                >
                  <TextArea rows={2} placeholder="List of tests conducted" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Treatments Given"
                  name="treatments_given"
                >
                  <TextArea rows={2} placeholder="List of treatments provided" />
                </Form.Item>
              </Col>
            </Row>

            {/* Medical History */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>📜 Medical History</Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Previous Treatment"
                  name="previous_treatment"
                >
                  <TextArea rows={2} placeholder="Details of previous treatments" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Past Hospitalizations"
                  name="past_hospitalizations"
                >
                  <TextArea rows={2} placeholder="Previous hospital admissions" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Past Surgery"
                  name="past_surgery"
                >
                  <TextArea rows={2} placeholder="Previous surgeries if any" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="COVID Vaccination"
                  name="covid_vaccination"
                >
                  <Select placeholder="Vaccination status">
                    <Option value="not_vaccinated">Not Vaccinated</Option>
                    <Option value="partially_vaccinated">Partially Vaccinated</Option>
                    <Option value="fully_vaccinated">Fully Vaccinated</Option>
                    <Option value="booster">Booster Taken</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label="Social Habits"
                  name="social_habits"
                >
                  <TextArea rows={2} placeholder="Smoking, drinking, exercise habits etc." />
                </Form.Item>
              </Col>
            </Row>

            {/* Video Call Assessment */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>📹 Video Call Assessment</Title>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Patient Seen on Call"
                  name="patient_seen_on_call"
                >
                  <Radio.Group>
                    <Radio value="yes">Yes</Radio>
                    <Radio value="no">No</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="IV Line Active"
                  name="iv_line_active"
                >
                  <Radio.Group>
                    <Radio value="yes">Yes</Radio>
                    <Radio value="no">No</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Patient Joined on Time"
                  name="patient_joined_on_time"
                >
                  <Radio.Group>
                    <Radio value="yes">Yes</Radio>
                    <Radio value="no">No</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label="Final Assessment"
                  name="final_assessment"
                >
                  <TextArea rows={4} placeholder="Doctor's final assessment and observations" />
                </Form.Item>
              </Col>
            </Row>

            {/* Investigation Details */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>🔍 Investigation Details</Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Conclusion Type"
                  name="conclusion_type"
                >
                  <Select placeholder="Select conclusion">
                    <Option value="genuine">Genuine</Option>
                    <Option value="suspicious">Suspicious</Option>
                    <Option value="fraudulent">Fraudulent</Option>
                    <Option value="needs_further_investigation">Needs Further Investigation</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Investigating Doctor"
                  name="investigating_doctor"
                >
                  <Input placeholder="Doctor who conducted investigation" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Case Received Date"
                  name="case_received_date"
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="VI Completed Date"
                  name="vi_completed_date"
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Match Score"
                  name="match_score"
                >
                  <Input type="number" placeholder="0-100" min={0} max={100} suffix="%" />
                </Form.Item>
              </Col>
            </Row>

            {/* Additional Information */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px', marginBottom: '20px' }}>➕ Additional Information</Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Geo Location"
                  name="geo_location"
                >
                  <Input placeholder="Latitude, Longitude" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Aadhar URL"
                  name="aadhar_url"
                >
                  <Input placeholder="Link to Aadhar document" />
                </Form.Item>
              </Col>
            </Row>

            {/* Document Upload */}
            <Title level={4} style={{ color: '#667eea', marginTop: '30px', borderTop: '2px solid #e0e7ff', paddingTop: '20px' }}>📎 Documents Upload</Title>
            <Form.Item
              label={<span style={{ color: '#667eea', fontWeight: 600 }}>Upload Supporting Documents</span>}
              name="documents"
            >
              <Upload
                multiple
                fileList={fileList}
                onChange={handleFileChange}
                beforeUpload={() => false}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              >
                <Button 
                  icon={<UploadOutlined />}
                  style={{
                    borderColor: '#667eea',
                    color: '#667eea',
                    borderRadius: '8px',
                    height: '40px',
                    fontWeight: 600,
                  }}
                >
                  Select Files
                </Button>
              </Upload>
              <Text style={{ fontSize: '12px', display: 'block', marginTop: '8px', color: '#764ba2' }}>
                📄 Supported: PDF, JPG, PNG, DOC, DOCX (Max 5MB each)
              </Text>
            </Form.Item>

            {/* Submit Button */}
            <Form.Item style={{ marginTop: '40px' }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  height: '50px',
                  fontSize: '16px',
                  fontWeight: 600,
                  borderRadius: '8px',
                }}
              >
                Submit Claim Form
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default ClaimForm;
