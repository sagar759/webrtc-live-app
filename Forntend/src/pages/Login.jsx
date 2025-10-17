import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, ConfigProvider, Modal, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { doctorLogin, adminLogin, registerDoctor } from '../services/api';
import Logo from '../assets/Logo.jpeg';

const { Title } = Typography;

function Login() {
  const [loading, setLoading] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isDoctorRegisterModalOpen, setIsDoctorRegisterModalOpen] = useState(false);
  const [adminLoginForm] = Form.useForm();
  const [doctorRegisterForm] = Form.useForm();
  const [adminToken, setAdminToken] = useState(null);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await doctorLogin(values.email, values.password);
      
      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.data));
        message.success('Login successful!');
        navigate('/home');
      }
      setLoading(false);
    } catch (error) {
      message.error(error.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleDoctorRegisterClick = () => {
    setIsAdminLoginModalOpen(true);
  };

  const handleAdminLoginCancel = () => {
    setIsAdminLoginModalOpen(false);
    adminLoginForm.resetFields();
  };

  const handleAdminLogin = async (values) => {
    setLoading(true);
    try {
      const response = await adminLogin(values.email, values.password);
      
      if (response.success) {
        setAdminToken(response.data.token);
        message.success('Admin login successful!');
        setIsAdminLoginModalOpen(false);
        adminLoginForm.resetFields();
        setLoading(false);
        // Open doctor registration modal
        setIsDoctorRegisterModalOpen(true);
      }
    } catch (error) {
      message.error(error.message || 'Admin login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleDoctorRegisterCancel = () => {
    setIsDoctorRegisterModalOpen(false);
    doctorRegisterForm.resetFields();
    setAdminToken(null);
  };

  const handleDoctorRegister = async (values) => {
    setLoading(true);
    try {
      const response = await registerDoctor(values, adminToken);
      
      if (response.success) {
        message.success('Doctor registered successfully! Please login with your credentials.');
        setIsDoctorRegisterModalOpen(false);
        doctorRegisterForm.resetFields();
        setAdminToken(null);
      }
      setLoading(false);
    } catch (error) {
      message.error(error.message || 'Failed to register doctor. Please try again.');
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#10b981',
          colorText: '#000000',
          colorBorder: '#10b981',
          fontFamily: 'Inter, sans-serif',
        },
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'transparent',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '50%',
          opacity: 0.1,
          animation: 'pulse 3s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '250px',
          height: '250px',
          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          borderRadius: '50%',
          opacity: 0.05,
          animation: 'pulse 4s ease-in-out infinite'
        }} />

        <Card
          className="animate-fade-in"
          style={{
            width: 450,
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            borderRadius: '16px',
            border: '2px solid #10b981',
            background: '#ffffff',
            zIndex: 1
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }} className="animate-slide-in">
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 20px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              overflow: 'hidden'
            }}>
              <img src={Logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <Title level={2} style={{ color: '#000000', marginBottom: '8px', fontWeight: 700 }}>
              Welcome Back
            </Title>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Please login to your account</p>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Email</span>}
              name="email"
              rules={[
                {
                  required: true,
                  message: 'Please input your email!',
                },
                {
                  type: 'email',
                  message: 'Please enter a valid email!',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#10b981' }} />}
                placeholder="Enter your email"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Password</span>}
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Please input your password!',
                },
                {
                  min: 6,
                  message: 'Password must be at least 6 characters!',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#10b981' }} />}
                placeholder="Enter your password"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  marginTop: '16px',
                  height: '50px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                Login
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Are you a new doctor?{' '}
              </span>
              <Button
                type="link"
                onClick={handleDoctorRegisterClick}
                style={{
                  color: '#10b981',
                  fontWeight: 600,
                  padding: 0,
                  fontSize: '14px'
                }}
              >
                Register here
              </Button>
            </div>
          </Form>
        </Card>

        {/* Admin Login Modal */}
        <Modal
          title={
            <Title level={3} style={{ margin: 0, color: '#000000' }}>
              <LockOutlined style={{ marginRight: '12px', color: '#10b981' }} />
              Admin Login Required
            </Title>
          }
          open={isAdminLoginModalOpen}
          onCancel={handleAdminLoginCancel}
          footer={null}
          width={450}
          centered
          styles={{
            header: {
              borderBottom: '2px solid #10b981',
              paddingBottom: '16px'
            }
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '16px' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              Only admin can register doctors. Please login with admin credentials.
            </span>
          </div>

          <Form
            form={adminLoginForm}
            layout="vertical"
            onFinish={handleAdminLogin}
          >
            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Admin Email</span>}
              name="email"
              rules={[
                {
                  required: true,
                  message: 'Please input admin email!',
                },
                {
                  type: 'email',
                  message: 'Please enter a valid email!',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#10b981' }} />}
                placeholder="Enter admin email"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Password</span>}
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Please input password!',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#10b981' }} />}
                placeholder="Enter password"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={handleAdminLoginCancel}
                  size="large"
                  style={{
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    border: '2px solid #e5e7eb',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Login as Admin
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Doctor Register Modal */}
        <Modal
          title={
            <Title level={3} style={{ margin: 0, color: '#000000' }}>
              Register New Doctor
            </Title>
          }
          open={isDoctorRegisterModalOpen}
          onCancel={handleDoctorRegisterCancel}
          footer={null}
          width={500}
          centered
          styles={{
            header: {
              borderBottom: '2px solid #10b981',
              paddingBottom: '16px'
            }
          }}
        >
          <Form
            form={doctorRegisterForm}
            layout="vertical"
            onFinish={handleDoctorRegister}
            style={{ marginTop: '24px' }}
          >
            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Name</span>}
              name="name"
              rules={[
                {
                  required: true,
                  message: 'Please input doctor name!',
                },
                {
                  min: 3,
                  message: 'Name must be at least 3 characters!',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#10b981' }} />}
                placeholder="Enter doctor name"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Email</span>}
              name="email"
              rules={[
                {
                  required: true,
                  message: 'Please input doctor email!',
                },
                {
                  type: 'email',
                  message: 'Please enter a valid email!',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#10b981' }} />}
                placeholder="Enter doctor email"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Password</span>}
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Please input password!',
                },
                {
                  min: 6,
                  message: 'Password must be at least 6 characters!',
                },
              ]}
            >
              <Input.Password
                placeholder="Enter password"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={handleDoctorRegisterCancel}
                  size="large"
                  style={{
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    border: '2px solid #e5e7eb',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Register Doctor
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
}

export default Login;
