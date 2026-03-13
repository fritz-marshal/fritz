import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Tooltip,
  Tabs,
  Tab,
  Stack,
  Link,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  PlayArrow as RunIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Fullscreen as FullscreenIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import { useCurrentBuilder } from "../../../../hooks/useContexts";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import FormValidationError from "../../../FormValidationError.jsx";
import ReactJson from "react-json-view";
import makeStyles from "@mui/styles/makeStyles";
import { useDispatch, useSelector } from "react-redux";
import {
  runBoomFilter,
  runBoomTestFilter,
  clearBoomFilter,
} from "../../../../ducks/boom_run_filter";

const useStyles = makeStyles((theme) => ({
  timeRange: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
}));

const getStageDescription = (stageName) => {
  const descriptions = {
    $match:
      "Filters documents to pass only those that match the specified condition(s)",
    $project:
      "Reshapes documents by including, excluding, or adding new fields",
    $lookup: "Performs a left outer join to documents from another collection",
    $unwind:
      "Deconstructs an array field to output a document for each element",
    $group:
      "Groups documents by a specified identifier and applies aggregation functions",
    $sort: "Sorts documents by specified field(s)",
    $limit: "Limits the number of documents passed to the next stage",
    $skip: "Skips a specified number of documents",
    $addFields: "Adds new fields to documents",
    $replaceRoot: "Replaces the input document with the specified document",
    $facet: "Processes multiple aggregation pipelines within a single stage",
    $bucket: "Categorizes documents into groups based on specified boundaries",
    $size: "Returns a count of the number of documents at this stage",
    $out: "Writes the resulting documents to a collection",
    $merge:
      "Writes the results of the aggregation pipeline to a specified collection",
    $filter: "Filters array elements based on specified criteria",
    $map: "Applies an expression to each element in an array",
    $reduce:
      "Applies an expression to each element in an array and combines them",
  };
  return descriptions[stageName] || "MongoDB aggregation stage";
};

// Helper function to properly combine user pipeline with additional stages
// Note: Sorting is now handled by the API, not in the pipeline
const combineWithPipeline = (
  userPipeline,
  additionalStages = [],
  isCountOnly = false,
) => {
  const finalPipeline = [];

  // Add user pipeline stages
  finalPipeline.push(...userPipeline);

  // Add any additional stages (like $limit, $size) before the final project stage
  if (additionalStages && additionalStages.length > 0) {
    finalPipeline.unshift(...additionalStages);
  }

  return finalPipeline;
};

const resetPaginationAndQueryState = (setters) => {
  const {
    setExpandedCells,
    setCurrentPage,
    setTotalDocuments,
    setIsLoadingPage,
    setPageCursors,
    setLastDocumentId,
    setHasNextPage,
    setLastPageOffset,
    setDisplayResults,
    setQueryCompleted,
  } = setters;

  setExpandedCells(new Set());
  setCurrentPage(1);
  setTotalDocuments(0);
  setIsLoadingPage(false);
  setPageCursors(new Map());
  setLastDocumentId(null);
  setHasNextPage(false);
  setLastPageOffset(0);
  setDisplayResults({ data: [] });

  // Optional setters that may not be available in all contexts
  if (setQueryCompleted) setQueryCompleted(false);
};

const getConvertedDatesFromForm = (getValues) => {
  const formData = getValues();
  let startDate, endDate;

  function utcToJulianDate(date) {
    const d = new Date(date);
    const time = d.getTime();
    const daysSinceEpoch = time / 86400000;
    const JD_UNIX_EPOCH = 2440587.5;
    return JD_UNIX_EPOCH + daysSinceEpoch;
  }

  if (formData.startDate) {
    startDate = utcToJulianDate(formData.startDate);
  }
  if (formData.endDate) {
    endDate = utcToJulianDate(formData.endDate);
  }

  return { startDate, endDate };
};

const MongoQueryDialog = () => {
  const {
    mongoDialog = { open: false },
    setMongoDialog,
    generateMongoQuery,
    getFormattedMongoQuery,
    hasValidQuery,
  } = useCurrentBuilder();
  const classes = useStyles();

  const filter_stream = useSelector(
    (state) => state.boom_filter_v.stream?.name?.split(" ")[0],
  );
  const filter_id = useSelector((state) => state.boom_filter_v.id);
  const last_result_id = useSelector((state) =>
    state.query_result?.data?.results?.at(-1),
  );

  const dispatch = useDispatch();
  const { useAMPM } = useSelector((state) => state.profile.preferences);

  const [copySuccess, setCopySuccess] = useState(false);
  const [displayResults, setDisplayResults] = useState({ data: [] }); // Local results for display
  const [selectedCollection, setSelectedCollection] = useState(
    filter_stream === "ZTF"
      ? "ZTF_alerts"
      : filter_stream === "LSST"
        ? "LSST_alerts"
        : "",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [dateValidationError, setDateValidationError] = useState(null);
  const [showPipeline, setShowPipeline] = useState(true);
  const [pipelineView, setPipelineView] = useState("complete");
  const [connectionStatus, setConnectionStatus] = useState("unknown");
  const [expandedCells, setExpandedCells] = useState(new Set());
  const [expandedStages, setExpandedStages] = useState(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [pageSize] = useState(50);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageCursors, setPageCursors] = useState(new Map());
  const [pageDataCache, setPageDataCache] = useState(new Map()); // Cache actual page data
  const [lastDocumentId, setLastDocumentId] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [queryCompleted, setQueryCompleted] = useState(false);
  const [lastQueryString, setLastQueryString] = useState("");
  const [lastPageOffset, setLastPageOffset] = useState(0);

  useEffect(() => {
    if (hasValidQuery()) {
      const currentQueryString = getFormattedMongoQuery();

      if (lastQueryString && lastQueryString !== currentQueryString) {
        dispatch(clearBoomFilter());
        resetPaginationAndQueryState({
          setExpandedCells,
          setCurrentPage,
          setTotalDocuments,
          setIsLoadingPage,
          setPageCursors,
          setLastDocumentId,
          setHasNextPage,
          setLastPageOffset,
          setDisplayResults,
          setQueryCompleted,
        });
      }

      setLastQueryString(currentQueryString);
    } else {
      if (lastQueryString) {
        dispatch(clearBoomFilter());
        setLastQueryString("");
        resetPaginationAndQueryState({
          setExpandedCells,
          setCurrentPage,
          setTotalDocuments,
          setIsLoadingPage,
          setPageCursors,
          setLastDocumentId,
          setHasNextPage,
          setLastPageOffset,
          setDisplayResults,
          setQueryCompleted,
        });
      }
    }
  }, [hasValidQuery, getFormattedMongoQuery, lastQueryString, dispatch]);

  useEffect(() => {
    const newCollection =
      filter_stream === "ZTF"
        ? "ZTF_alerts"
        : filter_stream === "LSST"
          ? "LSST_alerts"
          : "";

    if (
      newCollection !== selectedCollection &&
      newCollection !== "" &&
      selectedCollection !== ""
    ) {
      setSelectedCollection(newCollection);
      dispatch(clearBoomFilter());
      resetPaginationAndQueryState({
        setExpandedCells,
        setCurrentPage,
        setTotalDocuments,
        setIsLoadingPage,
        setPageCursors,
        setLastDocumentId,
        setHasNextPage,
        setLastPageOffset,
        setDisplayResults,
        setQueryCompleted,
      });
    } else if (selectedCollection === "" && newCollection !== "") {
      setSelectedCollection(newCollection);
    }
  }, [filter_stream, selectedCollection, dispatch]);

  const defaultStartDate = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 1);

  const {
    getValues,
    control,
    formState: { errors },
    watch,
  } = useForm({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });

  // Watch for date changes and validate
  const watchedStartDate = watch("startDate");
  const watchedEndDate = watch("endDate");

  useEffect(() => {
    if (watchedStartDate && watchedEndDate) {
      const startDate = new Date(watchedStartDate);
      const endDate = new Date(watchedEndDate);

      if (startDate > endDate) {
        setDateValidationError("Start date must be before end date.");
      } else {
        const diffInMs = endDate.getTime() - startDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays > 7) {
          setDateValidationError("Date range cannot exceed 7 days.");
        } else {
          setDateValidationError(null);
        }
      }
    } else {
      setDateValidationError(null);
    }
  }, [watchedStartDate, watchedEndDate]);

  const isDateRangeValid = () => {
    const formState = getValues();
    if (formState.startDate && formState.endDate) {
      const startDate = new Date(formState.startDate);
      const endDate = new Date(formState.endDate);

      // Check if start date is before end date
      if (startDate > endDate) {
        return false;
      }

      // Check if date range is maximum 7 days
      const diffInMs = endDate.getTime() - startDate.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      return diffInDays <= 7;
    }
    return true;
  };

  const handleStageToggle = (stageIndex) => {
    setExpandedStages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stageIndex)) {
        newSet.delete(stageIndex);
      } else {
        newSet.add(stageIndex);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (mongoDialog?.open) {
      loadCollections();
      resetPaginationAndQueryState({
        setExpandedCells,
        setCurrentPage,
        setTotalDocuments,
        setIsLoadingPage,
        setPageCursors,
        setLastDocumentId,
        setHasNextPage,
        setLastPageOffset,
        setDisplayResults,
        setQueryCompleted,
      });
    }
  }, [mongoDialog?.open]);

  const loadCollections = async () => {
    try {
      setConnectionStatus("connected");
    } catch (error) {
      console.error("Failed to load collections:", error);
      setConnectionStatus("disconnected");
    }
  };

  const handleClose = () => {
    setMongoDialog({ open: false });
    setQueryError(null);
    setShowPipeline(true);
    setPipelineView("complete");
    setExpandedStages(new Set());

    resetPaginationAndQueryState({
      setExpandedCells,
      setCurrentPage,
      setTotalDocuments,
      setIsLoadingPage,
      setPageCursors,
      setLastDocumentId,
      setHasNextPage,
      setLastPageOffset,
      setDisplayResults,
    });
  };

  const handleCopy = async () => {
    try {
      const query = getFormattedMongoQuery();
      await navigator.clipboard.writeText(query);
      setCopySuccess(true);
    } catch (err) {
      console.error("Failed to copy query:", err);
      const textArea = document.createElement("textarea");
      textArea.value = getFormattedMongoQuery();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
    }
  };

  const handleCopyStage = async (stageName, stageContent) => {
    try {
      const stageObject = { [stageName]: stageContent };
      const formattedStage = JSON.stringify(stageObject, null, 2);
      await navigator.clipboard.writeText(formattedStage);
      setCopySuccess(true);
    } catch (err) {
      console.error("Failed to copy stage:", err);
      const stageObject = { [stageName]: stageContent };
      const formattedStage = JSON.stringify(stageObject, null, 2);
      const textArea = document.createElement("textarea");
      textArea.value = formattedStage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
    }
  };

  const handleDownloadResults = () => {
    if (!displayResults.data || displayResults.data.length === 0) {
      return;
    }

    const jsonString = JSON.stringify(displayResults.data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `query-results-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const executeQuery = async (
    countOnly = false,
    cursor = null,
    direction = "forward",
    limit = pageSize + 1,
  ) => {
    const { startDate, endDate } = getConvertedDatesFromForm(getValues);

    const userPipeline = generateMongoQuery();

    let additionalStages = [];

    const pipeline = combineWithPipeline(
      userPipeline,
      additionalStages,
      countOnly,
    );

    const sortOrder = direction === "backward" ? "Descending" : "Ascending";
    const result = countOnly
      ? await dispatch(
          runBoomFilter({
            pipeline: pipeline,
            selectedCollection: selectedCollection,
            start_jd: startDate,
            end_jd: endDate,
            filter_id: filter_id,
          }),
        )
      : await dispatch(
          runBoomTestFilter({
            pipeline: pipeline,
            selectedCollection: selectedCollection,
            start_jd: startDate,
            end_jd: endDate,
            filter_id: filter_id,
            sort_by: "_id",
            sort_order: sortOrder,
            limit: limit,
            cursor: cursor,
          }),
        );

    if (countOnly) {
      return {
        result: result,
        hasNext: false,
        nextCursor: null,
      };
    }
    if (result.data?.data) {
      const originalData = result?.data?.data?.results;
      if (!originalData || originalData.length === 0) {
        setDisplayResults({ data: [] });
        return {
          result: result,
          hasNext: false,
          nextCursor: null,
          firstId: null,
          lastId: null,
        };
      }
      let hasMore = originalData.length > pageSize;
      let data;

      if (direction === "backward") {
        data = hasMore ? originalData.slice(0, pageSize + 1) : originalData;
        data = [...data].reverse();
      } else {
        data = hasMore ? originalData.slice(0, pageSize + 1) : originalData;
      }

      const processedResult = {
        ...result,
        data: {
          ...result.data,
          data: data,
        },
      };

      if (!countOnly) {
        setDisplayResults({ data: data });
      }

      // Store the actual displayed data boundaries for cursor navigation
      const firstId = data.length > 0 ? data[0]._id : null;
      const lastId = data.length > 0 ? data[data.length - 1]._id : null;

      return {
        result: processedResult,
        hasNext: hasMore,
        nextCursor: lastId,
        firstId: firstId,
        lastId: lastId,
        data: data, // Return data for caching
      };
    }
    return {
      result: result,
      hasNext: false,
      nextCursor: null,
      firstId: null,
      lastId: null,
    };
  };

  const handleRunQuery = async () => {
    // Validate date range before running the query
    const { startDate, endDate } = getConvertedDatesFromForm(getValues);
    if (startDate && endDate) {
      const diffInMs = endDate - startDate;
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays > 7) {
        setQueryError(
          "Date range cannot exceed 7 days. Please select a shorter time period.",
        );
        return;
      }
    }

    setIsRunning(true);
    setQueryError(null);

    resetPaginationAndQueryState({
      setExpandedCells,
      setCurrentPage,
      setTotalDocuments,
      setIsLoadingPage,
      setPageCursors,
      setLastDocumentId,
      setHasNextPage,
      setLastPageOffset,
      setDisplayResults,
      setQueryCompleted,
    });

    try {
      dispatch(clearBoomFilter());

      // Get first page data first
      const firstPageQueryResult = await executeQuery(false);

      if (firstPageQueryResult.result?.data) {
        dispatch({
          type: "skyportal/RUN_BOOM_FILTER_OK",
          data: firstPageQueryResult.result.data,
        });
      }

      setHasNextPage(firstPageQueryResult.hasNext);

      const newCursors = new Map();
      if (firstPageQueryResult.firstId && firstPageQueryResult.lastId) {
        newCursors.set(1, {
          firstId: firstPageQueryResult.firstId,
          lastId: firstPageQueryResult.lastId,
        });
      }

      setPageCursors(newCursors);

      // Cache page 1 data
      if (firstPageQueryResult.data) {
        const newCache = new Map();
        newCache.set(1, firstPageQueryResult.data);
        setPageDataCache(newCache);
      }

      // Get actual count after first page
      const countQueryResult = await executeQuery(true);
      // Good code when using queries/count endpoint
      // const actualCount = countQueryResult.result?.data?.data || 0;
      // temporary code to get count from results length
      const actualCount = countQueryResult.result?.data?.data?.count;
      setTotalDocuments(actualCount);

      // Set query completed only after both queries are done
      setQueryCompleted(true);
    } catch (error) {
      console.error("Query error:", error);
      setQueryError(error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePageChange = async (event, newPage) => {
    setIsLoadingPage(true);
    setExpandedCells(new Set());

    try {
      if (pageDataCache.has(newPage)) {
        const cachedData = pageDataCache.get(newPage);
        setDisplayResults({ data: cachedData });
        setCurrentPage(newPage);
        cachedData.length < pageSize + 1
          ? setHasNextPage(false)
          : setHasNextPage(true);
        setIsLoadingPage(false);
        return;
      }

      const isSequential = Math.abs(newPage - currentPage) === 1;

      if (isSequential) {
        let cursor = null;
        let direction = "forward";

        if (newPage > currentPage) {
          const currentPageData = pageCursors.get(currentPage);
          cursor = currentPageData?.lastId;
          direction = "forward";
        } else if (newPage < currentPage) {
          const currentPageData = pageCursors.get(currentPage);
          cursor = currentPageData?.firstId;
          direction = "backward";
        }

        const queryResult = await executeQuery(
          newPage,
          false,
          cursor,
          direction,
        );
        setHasNextPage(queryResult.hasNext);

        const newCursors = new Map(pageCursors);
        if (queryResult.firstId && queryResult.lastId) {
          newCursors.set(newPage, {
            firstId: queryResult.firstId,
            lastId: queryResult.lastId,
          });
        }
        setPageCursors(newCursors);

        if (queryResult.data) {
          const newCache = new Map(pageDataCache);
          newCache.set(newPage, queryResult.data);
          setPageDataCache(newCache);
        }

        setCurrentPage(newPage);
      } else {
        const lastPageOffsetCalc = totalDocuments - (newPage - 1) * pageSize;
        const countQueryResult = await executeQuery(
          newPage,
          false,
          null,
          "backward",
          lastPageOffsetCalc,
        );

        setHasNextPage(countQueryResult.hasNext);

        const newCursors = new Map(pageCursors);
        if (countQueryResult.firstId && countQueryResult.lastId) {
          newCursors.set(newPage, {
            firstId: countQueryResult.firstId,
            lastId: countQueryResult.lastId,
          });
        }
        setPageCursors(newCursors);

        if (countQueryResult.data) {
          const newCache = new Map(pageDataCache);
          newCache.set(newPage, countQueryResult.data);
          setPageDataCache(newCache);
        }

        setLastPageOffset(lastPageOffsetCalc);
        setCurrentPage(newPage);
      }
    } catch (error) {
      console.error("Page change error:", error);
      setQueryError(error.message);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleSnackbarClose = () => {
    setCopySuccess(false);
  };

  if (!mongoDialog?.open) {
    return null;
  }

  const pipeline = generateMongoQuery();
  const formattedQuery = getFormattedMongoQuery();
  const isValid = hasValidQuery();

  return (
    <>
      <Dialog
        open={mongoDialog.open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: "500px", maxHeight: "90vh" },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" component="div">
              MongoDB Aggregation Pipeline
            </Typography>
            {connectionStatus === "connected" && (
              <Chip label="Connected" color="success" size="small" />
            )}
            {connectionStatus === "disconnected" && (
              <Chip label="Disconnected" color="error" size="small" />
            )}
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {!isValid ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No filters defined. Add some conditions to generate a MongoDB
                query.
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Connection Warning */}
              {connectionStatus === "disconnected" && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">
                    MongoDB Connection Issue
                  </Typography>
                  <Typography variant="body2">
                    Unable to connect to MongoDB. Make sure MongoDB is running
                    on localhost:27017 and the backend server is started.
                  </Typography>
                </Alert>
              )}
              <form>
                <div>
                  {dateValidationError && (
                    <FormValidationError message={dateValidationError} />
                  )}

                  {/* Date Range Instructions */}
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.primary"
                      sx={{ mb: 0.5 }}
                    >
                      Select Time Range for Query
                    </Typography>
                  </Box>

                  <div className={classes.timeRange}>
                    <Controller
                      render={({ field: { onChange, value } }) => (
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DateTimePicker
                            value={value}
                            onChange={(newValue) => onChange(newValue)}
                            label="Start (Local Time)"
                            showTodayButton={false}
                            ampm={useAMPM}
                            slotProps={{ textField: { variant: "outlined" } }}
                          />
                        </LocalizationProvider>
                      )}
                      // rules={{ validate: validateDates }}
                      name="startDate"
                      control={control}
                      defaultValue={defaultStartDate}
                    />
                    <Controller
                      render={({ field: { onChange, value } }) => (
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DateTimePicker
                            value={value}
                            onChange={(newValue) => onChange(newValue)}
                            label="End (Local Time)"
                            showTodayButton={false}
                            ampm={useAMPM}
                            slotProps={{ textField: { variant: "outlined" } }}
                          />
                        </LocalizationProvider>
                      )}
                      // rules={{ validate: validateDates }}
                      name="endDate"
                      control={control}
                      defaultValue={defaultEndDate}
                    />
                  </div>
                </div>

                {/* Collection Selector and Run Controls */}
                <Box
                  sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    type="button"
                    startIcon={
                      isRunning ? <CircularProgress size={16} /> : <RunIcon />
                    }
                    onClick={handleRunQuery}
                    disabled={
                      isRunning ||
                      connectionStatus === "disconnected" ||
                      !!dateValidationError
                    }
                    sx={{ minWidth: 120 }}
                  >
                    {isRunning ? "Running..." : "Run Query"}
                  </Button>
                </Box>
              </form>

              {/* Query Error Display */}
              {queryError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">Query Error:</Typography>
                  <Typography variant="body2">{queryError}</Typography>
                </Alert>
              )}

              {/* Query Results */}
              {(displayResults.data?.length > 0 || queryCompleted) && (
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      Query Results
                    </Typography>
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
                    {totalDocuments > pageSize &&
                      displayResults.data?.length > 0 && (
                        <Chip
                          label={`Page ${currentPage} of ${Math.ceil(
                            totalDocuments / pageSize,
                          )}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    <IconButton
                      size="small"
                      onClick={handleDownloadResults}
                      disabled={!displayResults.data?.length}
                      title="Download results as JSON"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setIsFullscreen(true)}
                      disabled={!displayResults.data?.length}
                    >
                      <FullscreenIcon />
                    </IconButton>
                  </Box>
                  {displayResults.data?.length > 0 ? (
                    <>
                      <TableContainer
                        component={Paper}
                        sx={{
                          maxHeight: 400,
                          overflow: "auto",
                          width: "100%",
                          "& .MuiTable-root": {
                            minWidth: "100%",
                            width: "max-content",
                            tableLayout: "auto",
                          },
                          "&::-webkit-scrollbar": {
                            width: 8,
                            height: 8,
                          },
                          "&::-webkit-scrollbar-track": {
                            backgroundColor: "rgba(0,0,0,0.1)",
                          },
                          "&::-webkit-scrollbar-thumb": {
                            backgroundColor: "rgba(0,0,0,0.3)",
                            borderRadius: 4,
                          },
                        }}
                      >
                        <Table
                          size="small"
                          stickyHeader
                          sx={{
                            tableLayout: "auto",
                            width: "max-content",
                            minWidth: "100%",
                          }}
                        >
                          <TableHead>
                            <TableRow>
                              {Object.keys(displayResults.data[0] || {})
                                .filter((key) => key !== "_id")
                                .map((key) => (
                                  <TableCell
                                    key={key}
                                    sx={{
                                      fontWeight: "bold",
                                      minWidth: 150,
                                      whiteSpace: "nowrap",
                                      position: "sticky",
                                      top: 0,
                                      backgroundColor: "background.paper",
                                      zIndex: 1,
                                    }}
                                  >
                                    {key}
                                  </TableCell>
                                ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {displayResults?.data
                              ?.slice(0, 50)
                              .map((row, rowIndex) => (
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
                                  {Object.entries(row)
                                    .filter(([key]) => key !== "_id")
                                    .map(([key, value], cellIndex) => {
                                      const cellKey = `${rowIndex}-${cellIndex}`;
                                      const isJsonExpanded =
                                        expandedCells.has(cellKey);
                                      const hasJsonContent =
                                        typeof value === "object";
                                      const isObjectId =
                                        key === "objectId" &&
                                        typeof value === "string";

                                      return (
                                        <TableCell
                                          key={cellIndex}
                                          sx={{
                                            verticalAlign: "top",
                                            minWidth: hasJsonContent
                                              ? isJsonExpanded
                                                ? 300
                                                : 150
                                              : 100,
                                            maxWidth: hasJsonContent
                                              ? isJsonExpanded
                                                ? 600
                                                : 300
                                              : 200,
                                            width: hasJsonContent
                                              ? isJsonExpanded
                                                ? "auto"
                                                : "auto"
                                              : "auto",
                                            padding: 1,
                                            borderRight: "1px solid",
                                            borderColor: "divider",
                                            transition: "all 0.3s ease",
                                            overflow: "visible",
                                            height: "auto",
                                            minHeight: "fit-content",
                                          }}
                                        >
                                          {hasJsonContent ? (
                                            <Box
                                              sx={{
                                                minWidth: isJsonExpanded
                                                  ? 250
                                                  : 150,
                                                maxWidth: isJsonExpanded
                                                  ? 550
                                                  : 350,
                                                width: "100%",
                                                minHeight: "fit-content",
                                                height: "auto",
                                                overflow: "visible",
                                                "& .react-json-view": {
                                                  height: "auto !important",
                                                  minHeight: "fit-content",
                                                },
                                              }}
                                            >
                                              <ReactJson
                                                src={value}
                                                name={false}
                                                collapsed={
                                                  key === "annotations"
                                                    ? false
                                                    : !isJsonExpanded
                                                }
                                                displayDataTypes={false}
                                                displayObjectSize={false}
                                                enableClipboard={false}
                                                style={{
                                                  height: "auto",
                                                  minHeight: "fit-content",
                                                  lineHeight: "1.4",
                                                  fontSize: "12px",
                                                }}
                                              />
                                            </Box>
                                          ) : isObjectId ? (
                                            <Link
                                              href={`https://babamul.caltech.edu/objects/${filter_stream.toUpperCase()}/${value}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              <Typography
                                                variant="body2"
                                                sx={{
                                                  fontFamily: "monospace",
                                                  wordBreak: "break-word",
                                                }}
                                              >
                                                {String(value)}
                                              </Typography>
                                            </Link>
                                          ) : (
                                            <Typography
                                              variant="body2"
                                              sx={{
                                                fontFamily: "monospace",
                                                wordBreak: "break-word",
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
                      {/* Always show pagination info when there are results */}
                      {displayResults.data?.length > 0 && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            mt: 2,
                          }}
                        >
                          <Stack spacing={2}>
                            {/* Cursor-based pagination controls - show if there are multiple pages OR if hasNext is true OR if results exist */}
                            {(totalDocuments > pageSize ||
                              hasNextPage ||
                              currentPage > 1 ||
                              displayResults.data?.length >= pageSize) && (
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 1,
                                  alignItems: "center",
                                }}
                              >
                                <IconButton
                                  onClick={(e) => handlePageChange(e, 1)}
                                  disabled={currentPage <= 1 || isLoadingPage}
                                  size="small"
                                  title="First page"
                                >
                                  <FirstPageIcon />
                                </IconButton>

                                <IconButton
                                  onClick={(e) =>
                                    handlePageChange(e, currentPage - 1)
                                  }
                                  disabled={currentPage <= 1 || isLoadingPage}
                                  size="small"
                                  title="Previous page"
                                >
                                  <ChevronLeftIcon />
                                </IconButton>

                                <Typography
                                  variant="body2"
                                  sx={{ minWidth: 80, textAlign: "center" }}
                                >
                                  Page {currentPage}
                                </Typography>

                                <IconButton
                                  onClick={(e) =>
                                    handlePageChange(e, currentPage + 1)
                                  }
                                  disabled={!hasNextPage || isLoadingPage}
                                  size="small"
                                  title="Next page"
                                >
                                  <ChevronRightIcon />
                                </IconButton>

                                <IconButton
                                  onClick={(e) =>
                                    handlePageChange(
                                      e,
                                      Math.ceil(totalDocuments / pageSize),
                                    )
                                  }
                                  disabled={
                                    !hasNextPage ||
                                    isLoadingPage ||
                                    totalDocuments === 0
                                  }
                                  size="small"
                                  title="Last page"
                                >
                                  <LastPageIcon />
                                </IconButton>
                              </Box>
                            )}

                            <Typography
                              variant="caption"
                              sx={{
                                textAlign: "center",
                                color: "text.secondary",
                              }}
                            >
                              {isLoadingPage
                                ? "Loading..."
                                : totalDocuments > 0
                                  ? `Showing page ${currentPage} (${Math.min(
                                      displayResults.data?.length || 0,
                                      pageSize,
                                    )} results on this page)`
                                  : `Showing ${Math.min(
                                      displayResults.data?.length || 0,
                                      pageSize,
                                    )} results (cursor-based pagination)`}
                            </Typography>
                          </Stack>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ p: 2, textAlign: "center" }}
                    >
                      No documents matched the query
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />
                </Box>
              )}

              {/* Pipeline Visualization */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    MongoDB Pipeline ({pipeline.length} stage
                    {pipeline.length !== 1 ? "s" : ""})
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowPipeline(!showPipeline)}
                  >
                    {showPipeline ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>

                <Collapse in={showPipeline}>
                  {/* Pipeline View Tabs */}
                  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                    <Tabs
                      value={pipelineView}
                      onChange={(e, newValue) => setPipelineView(newValue)}
                      aria-label="pipeline view tabs"
                    >
                      <Tab
                        label="Complete Pipeline"
                        value="complete"
                        sx={{ textTransform: "none" }}
                      />
                      <Tab
                        label="Stage by Stage"
                        value="stages"
                        sx={{ textTransform: "none" }}
                      />
                    </Tabs>
                  </Box>

                  {/* Tab Content Container */}
                  <Box
                    sx={{
                      minHeight: "400px",
                      position: "relative",
                      backgroundColor: "background.paper",
                    }}
                  >
                    {/* Complete Pipeline View */}
                    {pipelineView === "complete" && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          minHeight: "100%",
                          backgroundColor: "background.paper",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight="bold">
                            Complete Pipeline JSON:
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CopyIcon />}
                            onClick={handleCopy}
                          >
                            Copy to Clipboard
                          </Button>
                        </Box>

                        <Box
                          sx={{
                            backgroundColor: "#f5f5f5",
                            border: "1px solid #ddd",
                            borderRadius: 1,
                            p: 2,
                            maxHeight: "400px",
                            overflow: "auto",
                          }}
                        >
                          <ReactJson src={pipeline} name={false} />
                        </Box>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 2, display: "block" }}
                        >
                          This aggregation pipeline can be used directly with
                          MongoDB&apos;s aggregate() method.
                        </Typography>
                      </Box>
                    )}

                    {/* Stage by Stage View */}
                    {pipelineView === "stages" && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          minHeight: "100%",
                          backgroundColor: "background.paper",
                        }}
                      >
                        {/* Individual Stage Details */}
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {pipeline.map((stage, index) => {
                            const stageName = Object.keys(stage)[0];
                            const stageContent = stage[stageName];
                            const description = getStageDescription(stageName);
                            const isStageExpanded = expandedStages.has(index);

                            return (
                              <Paper
                                key={index}
                                elevation={1}
                                sx={{
                                  p: 2,
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mb: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <Chip
                                      label={`Stage ${index + 1}`}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                    <Typography
                                      variant="h6"
                                      sx={{
                                        color: "primary.main",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {stageName}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleStageToggle(index)}
                                      sx={{ ml: 1 }}
                                    >
                                      {isStageExpanded ? (
                                        <ExpandLessIcon />
                                      ) : (
                                        <ExpandMoreIcon />
                                      )}
                                    </IconButton>
                                  </Box>
                                  <Tooltip title={`Copy ${stageName} stage`}>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleCopyStage(stageName, stageContent)
                                      }
                                      sx={{
                                        opacity: 0.7,
                                        "&:hover": { opacity: 1 },
                                      }}
                                    >
                                      <CopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mb: 2, fontStyle: "italic" }}
                                >
                                  {description}
                                </Typography>

                                <Collapse in={isStageExpanded}>
                                  <Box
                                    component="pre"
                                    sx={{
                                      backgroundColor: "#f8f9fa",
                                      border: "1px solid #e9ecef",
                                      borderRadius: 1,
                                      p: 1.5,
                                      overflow: "auto",
                                      maxHeight: "300px",
                                      fontFamily:
                                        'Monaco, Consolas, "Courier New", monospace',
                                      fontSize: "13px",
                                      lineHeight: 1.4,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      margin: 0,
                                    }}
                                  >
                                    {JSON.stringify(stageContent, null, 2)}
                                  </Box>
                                </Collapse>
                              </Paper>
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
        >
          MongoDB query copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Fullscreen Results Dialog */}
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
                  "& .MuiTable-root": {
                    minWidth: 650,
                  },
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
                          .map((key) => (
                            <TableCell
                              key={key}
                              sx={{
                                verticalAlign: "top",
                                height: "auto",
                                minHeight: "fit-content",
                              }}
                            >
                              {(() => {
                                const value = row[key];

                                // Handle null or undefined - display as text
                                if (value === null || value === undefined) {
                                  return (
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
                                  );
                                }

                                // Handle objects (including arrays)
                                if (typeof value === "object") {
                                  try {
                                    // Validate that the object can be stringified (valid JSON structure)
                                    JSON.stringify(value);

                                    return (
                                      <Box
                                        sx={{
                                          maxWidth: 300,
                                          maxHeight: expandedCells.has(
                                            `${rowIndex}-${key}`,
                                          )
                                            ? "none"
                                            : 100,
                                          overflow: expandedCells.has(
                                            `${rowIndex}-${key}`,
                                          )
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
                                              : !expandedCells.has(
                                                  `${rowIndex}-${key}`,
                                                )
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
                                    // If object can't be stringified, display error info
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
                                }

                                // Handle primitive values (string, number, boolean)
                                return (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      wordBreak: "break-word",
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {String(value)}
                                  </Typography>
                                );
                              })()}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Fullscreen Pagination Controls */}
              {(totalDocuments > pageSize ||
                hasNextPage ||
                currentPage > 1 ||
                displayResults.data?.length >= pageSize) && (
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
                        : `Showing ${
                            (currentPage - 1) * pageSize + 1
                          }-${Math.min(
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
    </>
  );
};

export default MongoQueryDialog;
