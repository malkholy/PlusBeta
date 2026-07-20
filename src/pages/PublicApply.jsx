import { useState, useEffect } from 'react';
import { apiCall, uploadToCloudinary } from '../shared/api.js';

const EGYPT_LOCATIONS = {
  'Cairo': ['New Cairo', 'Maadi', 'Nasr City', 'Heliopolis', 'Shoubra', 'Zamalek', 'Sheraton', 'El Rehab', 'Madinaty', 'Hadayek El-Kobba', 'Cairo City'],
  'Giza': ['6th of October', 'Sheikh Zayed', 'Haram', 'Faisal', 'Dokki', 'Mohandessin', 'Imbaba', 'Giza City'],
  'Alexandria': ['Sidi Bishr', 'Smouha', 'Miami', 'Montaza', 'Maamoura', 'Roushdy', 'Glim', 'Alexandria City'],
  'Qalyubia': ['Banha', 'Shubra El-Kheima', 'Qalyub', 'Khanka', 'Qaha'],
  'Gharbia': ['Tanta', 'Kafr El-Zayat', 'El Mahalla El-Kubra', 'Zifta'],
  'Monufia': ['Shibin El Kom', 'Sadat City', 'Ashmoun', 'Menouf'],
  'Sharqia': ['Zagazig', '10th of Ramadan', 'Belbeis', 'Minya El-Qamh'],
  'Dakahlia': ['Mansoura', 'Talkha', 'Mit Ghamr', 'Senbellawein'],
  'Damietta': ['Damietta City', 'New Damietta', 'Ras El Bar'],
  'Beheira': ['Damanhour', 'Kafr El Dawar', 'Kom Hamada', 'Rashid'],
  'Kafr El Sheikh': ['Kafr El Sheikh City', 'Desouk', 'Metoubes', 'Baltim'],
  'Matrouh': ['Marsa Matrouh', 'Siwa', 'El Alamein'],
  'Port Said': ['Port Said City', 'Port Fouad'],
  'Ismailia': ['Ismailia City', 'Fayed', 'El Qantara'],
  'Suez': ['Suez City', 'Ain Sokhna'],
  'North Sinai': ['Arish', 'Sheikh Zuweid'],
  'South Sinai': ['Sharm El Sheikh', 'Dahab', 'Nuweiba', 'Tor'],
  'Faiyum': ['Faiyum City', 'Sinnuris', 'Ibshaway'],
  'Beni Suef': ['Beni Suef City', 'New Beni Suef', 'Beba'],
  'Minya': ['Minya City', 'Mallawi', 'Samalut'],
  'Asyut': ['Asyut City', 'Dairut', 'Manfalut'],
  'Sohag': ['Sohag City', 'Akhmim', 'Girga'],
  'Qena': ['Qena City', 'Nag Hammadi', 'Deshna'],
  'Luxor': ['Luxor City', 'Esna', 'Armant'],
  'Aswan': ['Aswan City', 'Kom Ombo', 'Edfu'],
  'Red Sea': ['Hurghada', 'El Gouna', 'Safaga', 'Marsa Alam'],
  'New Valley': ['Kharga', 'Dakhla', 'Farafra']
};

export default function PublicApply({ requestId }) {
  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState('');
  
  const [formData, setFormData] = useState({
    FullName: '',
    Email: '',
    Phone: '',
    Government: '',
    City: '',
    Address: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [cvUrl, setCvUrl] = useState('');
  const [cvName, setCvName] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function loadJobDetails() {
      if (!requestId) {
        setJobError('Invalid Application Link (Missing Requisition ID)');
        setLoadingJob(false);
        return;
      }
      try {
        const res = await apiCall('Get Public Job Details', { RequestID: Number(requestId) }, {}, 'recruitment_requests');
        if (res.State === 0 && res.List0 && res.List0[0]) {
          setJob(res.List0[0]);
        } else {
          setJobError('This Job Requisition is either inactive or does not exist.');
        }
      } catch (err) {
        setJobError('Connection failed: ' + err.message);
      }
      setLoadingJob(false);
    }
    loadJobDetails();
  }, [requestId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF resumes are supported.');
      return;
    }

    setSelectedFile(file);
    setUploadingFile(true);
    setSubmitError('');

    try {
      const secureUrl = await uploadToCloudinary(file);
      setCvUrl(secureUrl);
      setCvName(file.name);
    } catch (err) {
      setSubmitError('CV Upload failed: ' + err.message);
      setSelectedFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cvUrl) {
      setSubmitError('Please upload your CV (PDF format) to submit your application.');
      return;
    }
    if (!formData.Government || !formData.City) {
      setSubmitError('Location (Government and City) is mandatory.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const attachments = JSON.stringify([{ name: cvName, url: cvUrl }]);
      const payload = {
        RequestID: Number(requestId),
        FullName: formData.FullName,
        Email: formData.Email,
        Phone: formData.Phone,
        Source: 'Careers Portal',
        Government: formData.Government,
        City: formData.City,
        Address: formData.Address,
        CVFileName: cvName,
        CVFileContent: attachments
      };

      const res = await apiCall('Save Candidate', payload, { User: 'Public Portal' }, 'recruitment_requests');
      if (res.State === 0) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(res.Message || 'Failed to submit application.');
      }
    } catch (err) {
      setSubmitError('Connection error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ width: 42, height: 42, border: '3.5px solid var(--border)', borderTopColor: 'var(--orange)', borderRadius: '50%', animation: 'spin .8s linear infinite', marginBottom: 16 }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Loading Requisition Details...</span>
      </div>
    );
  }

  if (jobError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '36px 24px', maxWidth: 450, textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Access Denied</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>{jobError}</p>
          <span style={{ fontSize: 12, color: 'var(--hint)' }}>Plus Beta Recruitment Portal</span>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '48px 32px', maxWidth: 500, textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>✓</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Application Submitted!</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Thank you, <strong>{formData.FullName}</strong>. Your profile has been successfully registered for the <strong>{job.PositionTitle}</strong> role. Our hiring team will review your application and CV shortly.
          </p>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--hint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Plus Beta Careers</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '40px 24px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Brand Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PB</div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>Plus Beta</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Careers Portal</p>
          </div>
        </header>

        {/* Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'start' }}>
          
          {/* Job Details Card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, boxShadow: 'var(--shadow)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', background: 'var(--orange-soft)', padding: '4px 10px', borderRadius: 6 }}>{job.Department}</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 12, marginBottom: 4 }}>{job.PositionTitle}</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 28 }}>Hiring Requisition Pool</p>

            <hr style={{ border: 0, borderTop: '1px solid var(--border)', marginBottom: 24 }} />

            {job.JobDescription && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 10 }}>Job Description</h3>
                <div style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.JobDescription}</div>
              </div>
            )}

            {job.RequiredSkills && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 12 }}>Required Skills & Qualifications</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {job.RequiredSkills.split(/,|\n/).map((skill, i) => {
                    const trimmed = skill.trim();
                    if (!trimmed) return null;
                    return (
                      <span key={i} style={{ fontSize: 12.5, fontWeight: 600, background: 'var(--soft)', border: '1px solid var(--border)', color: 'var(--text)', padding: '5px 12px', borderRadius: 20 }}>
                        {trimmed}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Submit Application</h2>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 24 }}>Please fill in your correct contact details and resume to apply.</p>

            {submitError && (
              <div style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.15)', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Full Name *</label>
                <input 
                  type="text" 
                  value={formData.FullName} 
                  onChange={e => setFormData({ ...formData, FullName: e.target.value })} 
                  style={{ width: '100%', height: 40, border: '1.5px solid var(--border)', borderRadius: 10, padding: '0 12px', background: 'var(--soft)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit' }} 
                  required 
                  placeholder="e.g. Aly Mohamed"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Email Address *</label>
                  <input 
                    type="email" 
                    value={formData.Email} 
                    onChange={e => setFormData({ ...formData, Email: e.target.value })} 
                    style={{ width: '100%', height: 40, border: '1.5px solid var(--border)', borderRadius: 10, padding: '0 12px', background: 'var(--soft)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit' }} 
                    required 
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Phone Number *</label>
                  <input 
                    type="text" 
                    value={formData.Phone} 
                    onChange={e => setFormData({ ...formData, Phone: e.target.value })} 
                    style={{ width: '100%', height: 40, border: '1.5px solid var(--border)', borderRadius: 10, padding: '0 12px', background: 'var(--soft)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit' }} 
                    required 
                    placeholder="e.g. +20100..."
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Government *</label>
                  <select 
                    value={formData.Government} 
                    onChange={e => setFormData({ ...formData, Government: e.target.value, City: '' })} 
                    style={{ width: '100%', height: 40, border: '1.5px solid var(--border)', borderRadius: 10, padding: '0 12px', background: 'var(--soft)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
                    required
                  >
                    <option value="">Select Province</option>
                    {Object.keys(EGYPT_LOCATIONS).map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>City *</label>
                  <select 
                    value={formData.City} 
                    onChange={e => setFormData({ ...formData, City: e.target.value })} 
                    style={{ width: '100%', height: 40, border: '1.5px solid var(--border)', borderRadius: 10, padding: '0 12px', background: 'var(--soft)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
                    disabled={!formData.Government}
                    required
                  >
                    <option value="">Select City</option>
                    {formData.Government && EGYPT_LOCATIONS[formData.Government].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Address Details</label>
                <input 
                  type="text" 
                  value={formData.Address} 
                  onChange={e => setFormData({ ...formData, Address: e.target.value })} 
                  style={{ width: '100%', height: 40, border: '1.5px solid var(--border)', borderRadius: 10, padding: '0 12px', background: 'var(--soft)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit' }} 
                  placeholder="Street, building, flat number"
                />
              </div>

              {/* Upload CV Dropzone */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Attach Resume (PDF) *</label>
                <div style={{ position: 'relative', border: '2px dashed var(--border)', borderRadius: 12, padding: '24px 16px', textAlign: 'center', background: 'var(--soft)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileChange} 
                    disabled={uploadingFile}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                  />
                  {uploadingFile ? (
                    <>
                      <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--orange)', borderRadius: '50%', animation: 'spin .8s linear infinite', marginBottom: 8 }} />
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Uploading file to server...</span>
                    </>
                  ) : cvUrl ? (
                    <>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--green)', maxWidth: '90%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cvName}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, textDecoration: 'underline' }}>Click to replace file</span>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📤</div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>Choose PDF File</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>or drag and drop resume here</span>
                    </>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting || uploadingFile}
                style={{ width: '100%', height: 44, background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff', border: 0, borderRadius: 12, fontWeight: 800, cursor: (submitting || uploadingFile) ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px var(--orange-glow)', marginTop: 10 }}
              >
                {submitting ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Submitting Application...
                  </>
                ) : (
                  <>Submit Application</>
                )}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
