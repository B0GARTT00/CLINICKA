import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, Syringe } from 'lucide-react';
import { useState } from 'react';
import { PatientPicker } from '../components/PatientPicker';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import {
  createScreening,
  createVaccination,
  getScreenings,
  getVaccinations,
} from '../services/api';

export function VaccinationsPage() {
  const queryClient = useQueryClient();
  const vaccinations = useQuery({ queryKey: ['vaccinations'], queryFn: getVaccinations });
  const screenings = useQuery({ queryKey: ['screenings'], queryFn: getScreenings });
  const [vaccination, setVaccination] = useState({
    patientId: '',
    vaccineName: '',
    dose: '',
    administeredAt: '',
    nextDoseAt: '',
    remarks: '',
  });
  const [screening, setScreening] = useState({
    patientId: '',
    screeningType: '',
    screenedAt: '',
    result: '',
    findings: '',
  });
  const saveVaccination = useMutation({
    mutationFn: () =>
      createVaccination({
        ...vaccination,
        administeredAt: new Date(vaccination.administeredAt).toISOString(),
        nextDoseAt: vaccination.nextDoseAt
          ? new Date(vaccination.nextDoseAt).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      setVaccination({
        patientId: '',
        vaccineName: '',
        dose: '',
        administeredAt: '',
        nextDoseAt: '',
        remarks: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
    },
  });
  const saveScreening = useMutation({
    mutationFn: () =>
      createScreening({ ...screening, screenedAt: new Date(screening.screenedAt).toISOString() }),
    onSuccess: () => {
      setScreening({ patientId: '', screeningType: '', screenedAt: '', result: '', findings: '' });
      void queryClient.invalidateQueries({ queryKey: ['screenings'] });
    },
  });

  if (vaccinations.isLoading || screenings.isLoading)
    return <LoadingState label="Loading vaccination and screening records..." />;
  if (vaccinations.isError || screenings.isError)
    return <ErrorState message="Unable to load health records." />;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brokenshire-600">
          Health records
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-medical-900">
          Vaccination history & screening
        </h1>
        <p className="mt-1 text-[13px] text-medical-500">
          Record vaccinations received by students and health screening results.
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Record vaccination history"
          description="Record a vaccination received from the clinic, hospital, or another provider."
        >
          <form
            className="space-y-3 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!vaccination.patientId) return;
              saveVaccination.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <PatientPicker
                value={vaccination.patientId}
                onChange={(patientId) => setVaccination((current) => ({ ...current, patientId }))}
              />
              <label>
                <span className="field-label">Vaccine</span>
                <input
                  required
                  value={vaccination.vaccineName}
                  onChange={(event) =>
                    setVaccination({ ...vaccination, vaccineName: event.target.value })
                  }
                  className="field-input"
                  placeholder="Hepatitis B"
                />
              </label>
              <label>
                <span className="field-label">Dose</span>
                <input
                  required
                  value={vaccination.dose}
                  onChange={(event) => setVaccination({ ...vaccination, dose: event.target.value })}
                  className="field-input"
                  placeholder="Dose 1"
                />
              </label>
              <label>
                <span className="field-label">Date received</span>
                <input
                  required
                  type="date"
                  value={vaccination.administeredAt}
                  onChange={(event) =>
                    setVaccination({ ...vaccination, administeredAt: event.target.value })
                  }
                  className="field-input"
                />
              </label>
              <label>
                <span className="field-label">Provider / source</span>
                <input
                  value={vaccination.remarks}
                  onChange={(event) =>
                    setVaccination({ ...vaccination, remarks: event.target.value })
                  }
                  className="field-input"
                  placeholder="Hospital or vaccination provider"
                />
              </label>
            </div>
            <Button disabled={!vaccination.patientId || saveVaccination.isPending}>
              <Plus className="h-4 w-4" />
              Save vaccination record
            </Button>
          </form>
        </Card>
        <Card title="Record screening" description="Record the result and relevant findings.">
          <form
            className="space-y-3 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!screening.patientId) return;
              saveScreening.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <PatientPicker
                value={screening.patientId}
                onChange={(patientId) => setScreening((current) => ({ ...current, patientId }))}
              />
              <label>
                <span className="field-label">Screening type</span>
                <input
                  required
                  value={screening.screeningType}
                  onChange={(event) =>
                    setScreening({ ...screening, screeningType: event.target.value })
                  }
                  className="field-input"
                  placeholder="Annual physical"
                />
              </label>
              <label>
                <span className="field-label">Screened</span>
                <input
                  required
                  type="date"
                  value={screening.screenedAt}
                  onChange={(event) =>
                    setScreening({ ...screening, screenedAt: event.target.value })
                  }
                  className="field-input"
                />
              </label>
              <label>
                <span className="field-label">Result</span>
                <input
                  required
                  value={screening.result}
                  onChange={(event) => setScreening({ ...screening, result: event.target.value })}
                  className="field-input"
                  placeholder="Cleared"
                />
              </label>
            </div>
            <label>
              <span className="field-label">Findings</span>
              <textarea
                value={screening.findings}
                onChange={(event) => setScreening({ ...screening, findings: event.target.value })}
                className="field-input min-h-16"
              />
            </label>
            <Button disabled={!screening.patientId || saveScreening.isPending}>
              <Plus className="h-4 w-4" />
              Save screening
            </Button>
          </form>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Recent vaccinations" description="Latest immunization records.">
          {vaccinations.data?.length ? (
            <div className="divide-y divide-medical-100">
              {vaccinations.data.map((record) => (
                <div className="flex items-center justify-between px-5 py-4" key={record.id}>
                  <div className="flex items-center gap-3">
                    <Syringe className="h-4 w-4 text-brokenshire-600" />
                    <div>
                      <p className="text-[13px] font-semibold text-medical-900">
                        {record.patient.firstName} {record.patient.lastName}
                      </p>
                      <p className="text-[11px] text-medical-500">
                        {record.vaccineName} · {record.dose} ·{' '}
                        {new Date(record.administeredAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Recorded</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-[13px] text-medical-500">No vaccination records yet.</p>
          )}
        </Card>
        <Card title="Recent screenings" description="Latest screening results.">
          {screenings.data?.length ? (
            <div className="divide-y divide-medical-100">
              {screenings.data.map((record) => (
                <div className="flex items-center justify-between px-5 py-4" key={record.id}>
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-4 w-4 text-brokenshire-600" />
                    <div>
                      <p className="text-[13px] font-semibold text-medical-900">
                        {record.patient.firstName} {record.patient.lastName}
                      </p>
                      <p className="text-[11px] text-medical-500">
                        {record.screeningType} · {record.result} ·{' '}
                        {new Date(record.screenedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="neutral">{record.result}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-[13px] text-medical-500">No screening records yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
