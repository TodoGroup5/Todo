
const OTPQRCode = ({ otpauthUrl }) => {
  if (!otpauthUrl) return null;

  return (
    <div className="p-4" >
      <h2 className="text-xl mb-2">Scan with your Authenticator app:</h2>
     <div style={{display:"flex", justifyContent:'center'}}>
      
        <img src={otpauthUrl} alt="QR Code" />
     </div>
     <p>Enter the verification code from your authenticator app below</p>
    </div>
  );
};

export default OTPQRCode;