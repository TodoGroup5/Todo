
const OTPQRCode = ({ otpauthUrl }) => {
  if (!otpauthUrl) return null;

  return (
    <div className="p-4">
      <h2 className="text-xl mb-2">Scan with your Authenticator app:</h2>
        <img src={otpauthUrl} alt="QR Code" />
    </div>
  );
};

export default OTPQRCode;