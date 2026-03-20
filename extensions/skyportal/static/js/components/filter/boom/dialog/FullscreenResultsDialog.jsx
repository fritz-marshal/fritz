import React from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Stack,
} from "@mui/material";
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import ReactJson from "react-json-view";

const FullscreenResultsDialog = ({
  isFullscreen,
  setIsFullscreen,
  displayResults,
  queryCompleted,
  totalDocuments,
  currentPage,
  pageSize,
  hasNextPage,
  isLoadingPage,
  expandedCells,
  handlePageChange,
  handleDownloadResults,
}) => {
  const showPagination =
    totalDocuments > pageSize ||
    hasNextPage ||
    currentPage > 1 ||
    displayResults.data?.length >= pageSize;

  return (
    <Dialog
      open={isFullscreen}
      onClose={() => setIsFullscreen(false)}
      maxWidth={false}
      fullScreen
      sx={{
        "& .MuiDialog-paper": {
          margin: 0,
          maxHeight: "100vh",
          height: "100vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6">Query Results</Typography>
          <Chip
            label={
              queryCompleted && totalDocuments === 0
                ? "0 documents"
                : queryCompleted
                  ? `${totalDocuments} documents`
                  : "Loading..."
            }
            size="small"
            color={
              queryCompleted && totalDocuments === 0
                ? "default"
                : queryCompleted
                  ? "success"
                  : "primary"
            }
          />
          {totalDocuments > pageSize && (
            <Chip
              label={`Page ${currentPage} of ${Math.ceil(
                totalDocuments / pageSize,
              )}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={handleDownloadResults}
            disabled={!displayResults.data?.length}
            title="Download results as JSON"
            sx={{ color: "text.secondary" }}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton
            onClick={() => setIsFullscreen(false)}
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {displayResults.data?.length > 0 ? (
          <>
            <TableContainer
              component={Paper}
              sx={{
                flex: 1,
                overflow: "auto",
                "& .MuiTable-root": { minWidth: 650 },
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {Object.keys(displayResults.data[0] || {})
                      .filter((key) => key !== "_id")
                      .map((key) => (
                        <TableCell
                          key={key}
                          sx={{
                            fontWeight: "bold",
                            backgroundColor: "grey.100",
                            whiteSpace: "nowrap",
                            minWidth: 120,
                          }}
                        >
                          {key}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayResults.data.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      sx={{
                        height: "auto",
                        minHeight: "fit-content",
                        "& .MuiTableCell-root": {
                          height: "auto",
                          minHeight: "fit-content",
                        },
                      }}
                    >
                      {Object.keys(row)
                        .filter((key) => key !== "_id")
                        .map((key) => {
                          const value = row[key];
                          const cellKey = `${rowIndex}-${key}`;
                          const isExpanded = expandedCells.has(cellKey);
                          return (
                            <TableCell
                              key={key}
                              sx={{
                                verticalAlign: "top",
                                height: "auto",
                                minHeight: "fit-content",
                              }}
                            >
                              {value === null || value === undefined ? (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    wordBreak: "break-word",
                                    whiteSpace: "pre-wrap",
                                    fontStyle: "italic",
                                    color: "text.secondary",
                                  }}
                                >
                                  {value === null ? "null" : "undefined"}
                                </Typography>
                              ) : typeof value === "object" ? (
                                (() => {
                                  try {
                                    JSON.stringify(value);
                                    return (
                                      <Box
                                        sx={{
                                          maxWidth: 300,
                                          maxHeight: isExpanded ? "none" : 100,
                                          overflow: isExpanded
                                            ? "visible"
                                            : "hidden",
                                          position: "relative",
                                          minHeight: "fit-content",
                                          height: "auto",
                                          "& .react-json-view": {
                                            height: "auto !important",
                                            minHeight: "fit-content",
                                          },
                                        }}
                                      >
                                        <ReactJson
                                          src={value}
                                          theme="rjv-default"
                                          collapsed={
                                            key === "annotations"
                                              ? false
                                              : !isExpanded
                                          }
                                          displayDataTypes={false}
                                          displayObjectSize={false}
                                          enableClipboard={false}
                                          name={false}
                                          style={{
                                            fontSize: "12px",
                                            lineHeight: "1.4",
                                            height: "auto",
                                            minHeight: "fit-content",
                                          }}
                                        />
                                      </Box>
                                    );
                                  } catch (error) {
                                    return (
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          wordBreak: "break-word",
                                          whiteSpace: "pre-wrap",
                                          color: "error.main",
                                        }}
                                      >
                                        {`[Invalid Object: ${error.message}]`}
                                      </Typography>
                                    );
                                  }
                                })()
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    wordBreak: "break-word",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {String(value)}
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {showPagination && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  p: 1,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Stack spacing={1}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 0.5,
                      alignItems: "center",
                    }}
                  >
                    <IconButton
                      onClick={(e) => handlePageChange(e, 1)}
                      disabled={currentPage <= 1 || isLoadingPage}
                      size="small"
                      title="First page"
                    >
                      <FirstPageIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={(e) => handlePageChange(e, currentPage - 1)}
                      disabled={currentPage <= 1 || isLoadingPage}
                      size="small"
                      title="Previous page"
                    >
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <Typography
                      variant="body2"
                      sx={{ minWidth: 100, textAlign: "center", mx: 1 }}
                    >
                      Page {currentPage} of{" "}
                      {Math.ceil(totalDocuments / pageSize)}
                    </Typography>
                    <IconButton
                      onClick={(e) => handlePageChange(e, currentPage + 1)}
                      disabled={!hasNextPage || isLoadingPage}
                      size="small"
                      title="Next page"
                    >
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={(e) =>
                        handlePageChange(
                          e,
                          Math.ceil(totalDocuments / pageSize),
                        )
                      }
                      disabled={!hasNextPage || isLoadingPage}
                      size="small"
                      title="Last page"
                    >
                      <LastPageIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ textAlign: "center", color: "text.secondary" }}
                  >
                    {isLoadingPage
                      ? "Loading..."
                      : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
                          currentPage * pageSize,
                          totalDocuments,
                        )} of ${totalDocuments} results`}
                  </Typography>
                </Stack>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              No results to display
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

FullscreenResultsDialog.propTypes = {
  isFullscreen: PropTypes.bool.isRequired,
  setIsFullscreen: PropTypes.func.isRequired,
  displayResults: PropTypes.shape({ data: PropTypes.array }).isRequired,
  queryCompleted: PropTypes.bool.isRequired,
  totalDocuments: PropTypes.number.isRequired,
  currentPage: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  isLoadingPage: PropTypes.bool.isRequired,
  expandedCells: PropTypes.instanceOf(Set).isRequired,
  handlePageChange: PropTypes.func.isRequired,
  handleDownloadResults: PropTypes.func.isRequired,
};

export default FullscreenResultsDialog;
