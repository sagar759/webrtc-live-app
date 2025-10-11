import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Typography, Space, message, Spin } from 'antd';
import { DownloadOutlined, ArrowLeftOutlined, FilePdfOutlined, HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const PDFPreview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get('claimId');
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    if (claimId) {
      // Set PDF URL
      const url = `http://localhost:5000/api/claims/${claimId}/pdf`;
      setPdfUrl(url);
      setLoading(false);
    } else {
      message.error('Claim ID not found');
      navigate('/home');
    }
  }, [claimId, navigate]);

  const handleDownloadPDF = () => {
    try {
      message.loading({ content: 'Downloading PDF...', key: 'download' });
      
      // Create download link
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `claim-${claimId}-report.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success({ content: 'PDF downloaded successfully!', key: 'download', duration: 2 });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error({ content: 'Failed to download PDF', key: 'download', duration: 2 });
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header with buttons */}
        <Card style={{
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <Title level={2} style={{ margin: 0, color: '#667eea' }}>
                <FilePdfOutlined style={{ marginRight: '12px' }} />
                PDF Report Preview
              </Title>
              <Text style={{ color: '#6b7280', fontSize: '16px' }}>
                Claim ID: <strong style={{ color: '#764ba2' }}>{claimId}</strong>
              </Text>
            </div>
            <Space size="middle">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/home')}
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #667eea',
                  color: '#667eea',
                  fontWeight: 600,
                  height: '45px',
                  padding: '0 24px',
                }}
              >
                Back to Home
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDF}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  height: '45px',
                  padding: '0 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                }}
              >
                Download PDF
              </Button>
            </Space>
          </div>
        </Card>

        {/* PDF Preview */}
        <Card style={{
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          padding: 0,
          overflow: 'hidden',
        }}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: 'calc(100vh - 200px)',
              border: 'none',
              borderRadius: '16px',
            }}
            title="PDF Preview"
          />
        </Card>

        {/* Bottom Actions */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
        }}>
          <Space size="large">
            <Button
              icon={<HomeOutlined />}
              onClick={() => navigate('/home')}
              size="large"
              style={{
                background: 'rgba(255,255,255,0.3)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '45px',
                padding: '0 24px',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
              }}
            >
              Go to Dashboard
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPDF}
              size="large"
              style={{
                background: '#ffffff',
                color: '#667eea',
                border: '2px solid #ffffff',
                borderRadius: '8px',
                height: '45px',
                padding: '0 24px',
                fontWeight: 600,
              }}
            >
              Download Report
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default PDFPreview;
