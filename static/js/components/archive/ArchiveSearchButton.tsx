import { Link } from "react-router-dom";

interface ArchiveSearchButtonProps {
  ra: number;
  dec: number;
  radius?: number;
}

const ArchiveSearchButton = ({
  ra,
  dec,
  radius = 3,
}: ArchiveSearchButtonProps) => {
  return (
    <Link
      to={`/archive?ra=${ra}&dec=${dec}&radius=${radius}`}
      target="_blank"
      style={{ textDecoration: "none", color: "black" }}
    >
      {`ZTF Light Curves (DR)`}
    </Link>
  );
};

export default ArchiveSearchButton;
