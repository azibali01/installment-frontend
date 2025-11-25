"use client";

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../contexts/AuthContext";

type Req = {
  _id: string;
  installmentId: any;
  type: string;
  requestedBy: any;
  status: string;
  reason?: string;
  reviewedBy?: any;
  reviewedAt?: string;
  reviewComment?: string;
  changes?: Record<string, any>;
};

const RequestsPage: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [totalPagesServer, setTotalPagesServer] = useState<number>(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [detailsRequest, setDetailsRequest] = useState<Req | null>(null);
  const [detailsInstallment, setDetailsInstallment] = useState<any>(null);

  useEffect(() => {
    void load();
  }, [filterStatus, page, limit]);

  async function load() {
    setLoading(true);
    try {
      const parts: string[] = [];
      parts.push(`page=${page}`);
      parts.push(`limit=${limit}`);
      if (filterStatus && filterStatus !== "all") {
        parts.push(`status=${filterStatus}`);
      }
      const qs = parts.length ? `?${parts.join("&")}` : "";
      const res = await client.get(`/installment-requests${qs}`);
      const payload = res.data;
      if (Array.isArray(payload)) {
        setRequests(payload);
        setTotalPagesServer(Math.max(1, Math.ceil(payload.length / limit)));
      } else if (payload && Array.isArray(payload.data)) {
        setRequests(payload.data);
        setTotalPagesServer(payload.meta?.totalPages || 1);
      } else {
        setRequests([]);
        setTotalPagesServer(1);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, act: "approve" | "reject") {
    setActionId(id);
    setActionType(act);
  }

  async function confirmAction() {
    if (!actionId || !actionType) return;
    const prev = [...requests];
    try {
      setRequests((rs) =>
        rs.map((r) =>
          r._id === actionId
            ? {
                ...r,
                status: actionType === "approve" ? "approved" : "rejected",
                reviewedBy: user || r.reviewedBy,
                reviewedAt: new Date().toISOString(),
              }
            : r
        )
      );

      if (actionType === "approve") {
        await client.put(`/installment-requests/${actionId}/approve`);
      } else {
        await client.put(`/installment-requests/${actionId}/reject`, {});
      }
    } catch (err: any) {
      setRequests(prev);
      setError(err?.response?.data?.error || "Failed to perform action");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  }

  async function openDetails(r: Req) {
    setDetailsRequest(r);
    setDetailsInstallment(null);
    try {
      const id =
        typeof r.installmentId === "string"
          ? r.installmentId
          : r.installmentId?._id;
      if (id) {
        const res = await client.get(`/installments/${id}`);
        setDetailsInstallment(res.data);
      }
    } catch (err) {
      // ignore, we'll still show proposed changes
    }
  }

  function closeDetails() {
    setDetailsRequest(null);
    setDetailsInstallment(null);
  }

  if (!hasPermission || !hasPermission("manage_installments")) {
    return <div className="p-6">Access denied</div>;
  }

  const totalPages = totalPagesServer;
  const pagedRequests = requests;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Requests</h1>
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm text-slate-600">Status</label>
        <select
          className="px-3 py-1 border rounded"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <label className="text-sm text-slate-600 ml-4">Page size</label>
        <select
          className="px-3 py-1 border rounded"
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value) || 10);
            setPage(1);
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : requests.length === 0 ? (
        <div>No requests</div>
      ) : (
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Installment</th>
                  <th className="px-4 py-2 text-left">Requested By</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Reviewed By</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRequests.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="px-4 py-2 align-top">{r.type}</td>
                    <td className="px-4 py-2 align-top">
                      {r.installmentId &&
                      typeof r.installmentId === "object" ? (
                        <Link
                          to={`/installment/${r.installmentId._id}`}
                          className="text-blue-600 underline"
                        >
                          {r.installmentId.customerId?.name
                            ? `${r.installmentId.customerId.name} — ${
                                r.installmentId.totalAmount
                                  ? Number(
                                      r.installmentId.totalAmount
                                    ).toLocaleString()
                                  : r.installmentId._id
                              }`
                            : r.installmentId._id}
                        </Link>
                      ) : (
                        <Link
                          to={`/installment/${r.installmentId}`}
                          className="text-blue-600 underline"
                        >
                          {String(r.installmentId)}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {r.requestedBy?.name || r.requestedBy}
                    </td>
                    <td className="px-4 py-2 align-top">{r.reason || "-"}</td>
                    <td className="px-4 py-2 align-top">
                      <span
                        className={`font-semibold capitalize ${
                          r.status === "approved"
                            ? "text-green-600"
                            : r.status === "rejected"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top">
                      {r.reviewedBy?.name || r.reviewedBy || "-"}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {new Date(
                        (r as any).createdAt || Date.now()
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetails(r)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          Details
                        </button>
                        {r.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleAction(r._id, "approve")}
                              className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(r._id, "reject")}
                              className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-slate-600">
                            {r.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pn) => (
              <button
                key={pn}
                onClick={() => setPage(pn)}
                className={`px-3 py-1 border rounded ${
                  pn === page ? "bg-blue-600 text-white" : ""
                }`}
              >
                {pn}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {/* Details modal */}
      {detailsRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={closeDetails}
          />
          <div className="bg-white rounded shadow-lg z-10 w-11/12 max-w-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Request Details</h3>
              <button onClick={closeDetails} className="px-2 py-1">
                Close
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <strong>Type:</strong> {detailsRequest.type}
              </div>
              <div>
                <strong>Installment:</strong>{" "}
                {detailsRequest.installmentId?._id ||
                  detailsRequest.installmentId}
              </div>
              <div>
                <strong>Requested by:</strong>{" "}
                {detailsRequest.requestedBy?.name || detailsRequest.requestedBy}
              </div>
              {detailsRequest.reason && (
                <div>
                  <strong>Reason:</strong> {detailsRequest.reason}
                </div>
              )}

              {detailsRequest.type === "edit" && (
                <div>
                  <h4 className="font-semibold mt-2">Proposed changes</h4>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(detailsRequest.changes, null, 2)}
                  </pre>

                  {detailsInstallment && (
                    <div className="mt-3">
                      <h4 className="font-semibold">
                        Diff (current → proposed)
                      </h4>
                      <table className="min-w-full table-auto mt-2">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-3 py-2 text-left">Field</th>
                            <th className="px-3 py-2 text-left">Current</th>
                            <th className="px-3 py-2 text-left">Proposed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(detailsRequest.changes || {}).map(
                            (key) => (
                              <tr key={key} className="border-t">
                                <td className="px-3 py-2 align-top">{key}</td>
                                <td className="px-3 py-2 align-top">
                                  {String(
                                    (detailsInstallment as any)[key] ?? "—"
                                  )}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  {String((detailsRequest.changes as any)[key])}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!actionId}
        title={actionType === "approve" ? "Approve Request" : "Reject Request"}
        message={
          actionType === "approve"
            ? "Approve this request?"
            : "Reject this request?"
        }
        confirmLabel={actionType === "approve" ? "Approve" : "Reject"}
        cancelLabel="Cancel"
        onConfirm={async () => await confirmAction()}
        onCancel={() => {
          setActionId(null);
          setActionType(null);
        }}
      />
    </div>
  );
};

export default RequestsPage;
