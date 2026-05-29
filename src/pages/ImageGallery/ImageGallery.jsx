import React, { useCallback, useContext, useEffect, useState } from "react";
import { UserContext } from "@/common/contexts/UserContext";
import { auth } from "@/firebase-config";
import styled from "styled-components";


const Page = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: var(--secondary-lightgrey, #f3f3f3);
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 1.8rem;
    color: var(--darkgrey, #747474);
    letter-spacing: 1px;
  }

  h3 {
    margin: 0;
    font-weight: 400;
    color: var(--darkgrey, #747474);
    opacity: 0.8;
  }
`;


const UploadBox = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 20px 0;

  padding: 16px;
  border-radius: 12px;
  background: var(--white, #fff);
  border: 1px solid #e6e6e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
`;

const HiddenInput = styled.input`
  display: none;
`;

const FileLabel = styled.label`
  padding: 9px 14px;
  background: var(--secondary-lightgrey, #f3f3f3);
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: #e9e9e9;
  }
`;

const FileName = styled.span`
  font-size: 0.85rem;
  color: var(--darkgrey, #747474);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Button = styled.button`
  padding: 9px 16px;
  cursor: pointer;
  background: var(--primary-green, #45bf84);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    background: #3aa873;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #b8e3cc;
    cursor: not-allowed;
    transform: none;
  }
`;


const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  width: 100%;
  max-width: 1000px;
  margin-top: 24px;
`;

/* card */
const Card = styled.div`
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  padding: 10px;
  background: var(--white, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  transition: transform 0.15s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-3px);
  }

  small {
    display: block;
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--darkgrey, #747474);
    opacity: 0.8;
  }
`;

const Img = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
`;

// Modal styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  position: relative;
`;

const ModalImg = styled.img`
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const DeleteButton = styled(Button)`
  background: #dc3545;

  &:hover {
    background: #c82333;
  }
`;


export default function ImageGallery() {
  const { user } = useContext(UserContext);

  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const API = import.meta.env.VITE_BACKEND_URL;


  const loadImages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/images`);
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error("Failed to load images:", err);
      setImages([]);
    }
  }, [API]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);


  const uploadImage = async () => {
    if (!file) return alert("Please select a file");

    setLoading(true);

    try {
      // 1. get signed URL
      const signRes = await fetch(`${API}/images/s3-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          type: file.type,
        }),
      });

      if (!signRes.ok) throw new Error("Failed to get signed URL");

      const { url, method } = await signRes.json();

      // 2. upload to S3
      const uploadRes = await fetch(url, {
        method,
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("S3 upload failed");

      setFile(null);

      // 3. refresh gallery
      await loadImages();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (key) => {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/images`, {
        method: 'DELETE',
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ key })
      });
      if (!res.ok) throw new Error('Delete failed');
      setModalOpen(false);
      await loadImages();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  return (
    <Page>
      <TextContainer>
        <h1>IMAGE GALLERY</h1>
        <h3>Welcome, {user?.firstname || "User"}</h3>
      </TextContainer>

      {/* UPLOAD SECTION */}
      <UploadBox>
        <HiddenInput
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <FileLabel htmlFor="file-upload">
          Choose Image
        </FileLabel>

        <FileName>
          {file ? file.name : "No file selected"}
        </FileName>

        <Button onClick={uploadImage} disabled={loading || !file}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </UploadBox>

      {/* IMAGE GRID */}
      <Grid>
        {images.map((img) => (
          <Card key={img.key} onClick={() => { setSelectedImage(img); setModalOpen(true); }}>
            <Img src={img.url} alt={img.key?.split("/").pop()} />
            <small>{img.key?.split("/").pop()}</small>
          </Card>
        ))}
      </Grid>

      {/* MODAL */}
      {modalOpen && (
        <ModalOverlay onClick={() => setModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalImg src={selectedImage.url} alt={selectedImage.key?.split("/").pop()} />
            <ModalButtons>
              <Button onClick={() => setModalOpen(false)}>Close</Button>
              <DeleteButton onClick={() => deleteImage(selectedImage.key)}>Delete</DeleteButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}
    </Page>
  );
}